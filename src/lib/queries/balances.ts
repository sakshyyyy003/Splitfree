import "server-only";

import { simplifyDebts } from "@/lib/algorithms/debt";
import { createClient } from "@/lib/supabase/server";
import type {
  DashboardCounterpartyBalance,
  DashboardOverallBalances,
} from "@/types/dashboard";
import type {
  GroupBalance,
  GroupBalanceSummary,
  GroupSimplifiedDebt,
} from "@/types/group-detail";

/**
 * Raw shape returned by the `calculate_group_balances` Postgres function.
 * The function returns jsonb with two arrays: balances and simplified_debts.
 */
type RawBalanceEntry = {
  user_id: string;
  balance: number;
};

type RawSimplifiedDebt = {
  from: string;
  to: string;
  amount: number;
};

type RawGroupBalancesResponse = {
  balances: RawBalanceEntry[];
  simplified_debts: RawSimplifiedDebt[];
};

type GroupMemberWithProfile = {
  user_id: string;
  role: string;
  profiles: {
    name: string;
    email: string;
    avatar_url: string | null;
  } | null;
};

type MemberLookupEntry = {
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
};

function isMissingCalculateBalancesFunction(message: string): boolean {
  return (
    message.includes("public.calculate_group_balances") &&
    message.includes("schema cache")
  );
}

function buildMemberLookup(members: GroupMemberWithProfile[]) {
  const memberLookup = new Map<string, MemberLookupEntry>();

  for (const member of members) {
    memberLookup.set(member.user_id, {
      name: member.profiles?.name ?? "Unknown",
      email: member.profiles?.email ?? "",
      avatarUrl: member.profiles?.avatar_url ?? null,
      role: member.role,
    });
  }

  return memberLookup;
}

function isMissingTableInSchemaCache(message: string): boolean {
  return (
    message.includes("Could not find the table") &&
    message.includes("schema cache")
  );
}

async function getGroupMembersWithProfiles(groupId: string) {
  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("group_members")
    .select("user_id, role, profiles(name, email, avatar_url)")
    .eq("group_id", groupId);

  if (error) {
    if (isMissingTableInSchemaCache(error.message)) {
      return [];
    }

    throw new Error(`Failed to fetch group member profiles: ${error.message}`);
  }

  return (members ?? []) as unknown as GroupMemberWithProfile[];
}

async function getGroupBalancesFallback(
  groupId: string,
): Promise<GroupBalanceSummary> {
  const supabase = await createClient();
  const members = await getGroupMembersWithProfiles(groupId);
  const memberLookup = buildMemberLookup(members);

  const { data: expenses, error: expensesError } = await supabase
    .from("expenses")
    .select("id, paid_by, amount")
    .eq("group_id", groupId)
    .eq("is_deleted", false);

  if (expensesError) {
    if (!isMissingTableInSchemaCache(expensesError.message)) {
      throw new Error(`Failed to fetch group expenses: ${expensesError.message}`);
    }
  }

  const expenseIds = (expenses ?? []).map((expense) => expense.id);

  const { data: splits, error: splitsError } = expenseIds.length
    ? await supabase
        .from("expense_splits")
        .select("expense_id, user_id, amount")
        .in("expense_id", expenseIds)
    : { data: [], error: null };

  if (splitsError) {
    if (!isMissingTableInSchemaCache(splitsError.message)) {
      throw new Error(`Failed to fetch expense splits: ${splitsError.message}`);
    }
  }

  const { data: settlements, error: settlementsError } = await supabase
    .from("settlements")
    .select("paid_by, paid_to, amount")
    .eq("group_id", groupId);

  if (settlementsError) {
    if (!isMissingTableInSchemaCache(settlementsError.message)) {
      throw new Error(
        `Failed to fetch group settlements: ${settlementsError.message}`,
      );
    }
  }

  const balanceByUser = new Map<string, number>();

  for (const expense of expenses ?? []) {
    balanceByUser.set(
      expense.paid_by,
      (balanceByUser.get(expense.paid_by) ?? 0) + expense.amount,
    );
  }

  for (const split of splits ?? []) {
    balanceByUser.set(
      split.user_id,
      (balanceByUser.get(split.user_id) ?? 0) - split.amount,
    );
  }

  for (const settlement of settlements ?? []) {
    balanceByUser.set(
      settlement.paid_by,
      (balanceByUser.get(settlement.paid_by) ?? 0) - settlement.amount,
    );
    balanceByUser.set(
      settlement.paid_to,
      (balanceByUser.get(settlement.paid_to) ?? 0) + settlement.amount,
    );
  }

  const roundedBalances = Array.from(balanceByUser.entries())
    .map(([userId, balance]) => ({
      userId,
      balance: Math.round(balance * 100) / 100,
    }))
    .filter((entry) => entry.balance !== 0)
    .sort((left, right) => right.balance - left.balance);

  const balances: GroupBalance[] = roundedBalances.map((entry) => {
    const memberInfo = memberLookup.get(entry.userId);

    return {
      userId: entry.userId,
      name: memberInfo?.name ?? "Unknown",
      email: memberInfo?.email ?? "",
      avatarUrl: memberInfo?.avatarUrl ?? null,
      role: (memberInfo?.role ?? "member") as "admin" | "member",
      netBalance: entry.balance,
    };
  });

  const simplifiedDebts: GroupSimplifiedDebt[] = simplifyDebts(
    roundedBalances,
  ).map((debt) => {
    const fromMember = memberLookup.get(debt.fromUserId);
    const toMember = memberLookup.get(debt.toUserId);

    return {
      fromUserId: debt.fromUserId,
      fromName: fromMember?.name ?? "Unknown",
      toUserId: debt.toUserId,
      toName: toMember?.name ?? "Unknown",
      amount: debt.amount,
    };
  });

  return { balances, simplifiedDebts };
}

export async function getGroupBalances(
  groupId: string,
): Promise<GroupBalanceSummary> {
  const supabase = await createClient();

  // 1. Call the Postgres function to get raw balances and simplified debts
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "calculate_group_balances",
    { p_group_id: groupId },
  );

  if (rpcError) {
    if (isMissingCalculateBalancesFunction(rpcError.message)) {
      return getGroupBalancesFallback(groupId);
    }

    throw new Error(
      `Failed to calculate group balances: ${rpcError.message}`,
    );
  }

  const raw = rpcData as unknown as RawGroupBalancesResponse;

  // 2. If there are no balances, return early with empty arrays
  if (!raw?.balances?.length) {
    return { balances: [], simplifiedDebts: [] };
  }

  // 3. Fetch group members with profile data to enrich the balance entries
  const userIds = raw.balances.map((b) => b.user_id);
  const members = await getGroupMembersWithProfiles(groupId);
  const memberLookup = buildMemberLookup(
    members.filter((member) => userIds.includes(member.user_id)),
  );

  // 5. Merge raw balances with profile data to produce GroupBalance[]
  const balances: GroupBalance[] = raw.balances.map((entry) => {
    const memberInfo = memberLookup.get(entry.user_id);

    return {
      userId: entry.user_id,
      name: memberInfo?.name ?? "Unknown",
      email: memberInfo?.email ?? "",
      avatarUrl: memberInfo?.avatarUrl ?? null,
      role: (memberInfo?.role ?? "member") as "admin" | "member",
      netBalance: entry.balance,
    };
  });

  // 6. Enrich simplified_debts with user names for the UI
  const simplifiedDebts: GroupSimplifiedDebt[] = raw.simplified_debts.map(
    (debt) => {
      const fromMember = memberLookup.get(debt.from);
      const toMember = memberLookup.get(debt.to);

      return {
        fromUserId: debt.from,
        fromName: fromMember?.name ?? "Unknown",
        toUserId: debt.to,
        toName: toMember?.name ?? "Unknown",
        amount: debt.amount,
      };
    },
  );

  return { balances, simplifiedDebts };
}

// ---------------------------------------------------------------------------
// Overall Balances (across all groups)
// ---------------------------------------------------------------------------

/**
 * Raw shape returned by the `calculate_overall_balances` Postgres function.
 * The function returns jsonb with counterparties and summary.
 */
type RawOverallCounterparty = {
  user_id: string;
  net_balance: number;
  group_ids: string[];
};

type RawOverallSummary = {
  total_owed: number;
  total_you_owe: number;
  net_balance: number;
};

type RawOverallBalancesResponse = {
  counterparties: RawOverallCounterparty[];
  summary: RawOverallSummary;
};

type ProfileEntry = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
};

type GroupEntry = {
  id: string;
  name: string;
};

function isMissingOverallBalancesFunction(message: string): boolean {
  return (
    message.includes("calculate_overall_balances") &&
    message.includes("schema cache")
  );
}

function buildEmptyOverallBalances(): DashboardOverallBalances {
  return {
    summary: {
      currency: "USD",
      totalOwed: 0,
      totalYouOwe: 0,
      netBalance: 0,
      updatedAt: new Date().toISOString(),
    },
    counterparties: [],
  };
}

function buildGroupLabel(groupNames: string[]): string {
  if (groupNames.length === 0) return "No groups";
  if (groupNames.length === 1) return groupNames[0];
  return `${groupNames.length} groups`;
}

async function fetchProfilesByIds(
  userIds: string[],
): Promise<Map<string, ProfileEntry>> {
  if (userIds.length === 0) return new Map();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, avatar_url")
    .in("id", userIds);

  if (error) {
    if (isMissingTableInSchemaCache(error.message)) {
      return new Map();
    }
    throw new Error(`Failed to fetch profiles: ${error.message}`);
  }

  const lookup = new Map<string, ProfileEntry>();
  for (const profile of data ?? []) {
    lookup.set(profile.id, profile);
  }
  return lookup;
}

async function fetchGroupsByIds(
  groupIds: string[],
): Promise<Map<string, GroupEntry>> {
  if (groupIds.length === 0) return new Map();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("id, name")
    .in("id", groupIds);

  if (error) {
    if (isMissingTableInSchemaCache(error.message)) {
      return new Map();
    }
    throw new Error(`Failed to fetch groups: ${error.message}`);
  }

  const lookup = new Map<string, GroupEntry>();
  for (const group of data ?? []) {
    lookup.set(group.id, group);
  }
  return lookup;
}

export async function getOverallBalances(): Promise<DashboardOverallBalances> {
  const supabase = await createClient();

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "calculate_overall_balances",
  );

  if (rpcError) {
    if (isMissingOverallBalancesFunction(rpcError.message)) {
      return buildEmptyOverallBalances();
    }
    throw new Error(
      `Failed to calculate overall balances: ${rpcError.message}`,
    );
  }

  const raw = rpcData as unknown as RawOverallBalancesResponse;

  if (!raw?.counterparties?.length) {
    return buildEmptyOverallBalances();
  }

  // Collect all user IDs and group IDs for batch fetching
  const allUserIds = raw.counterparties.map((c) => c.user_id);
  const allGroupIds = [
    ...new Set(raw.counterparties.flatMap((c) => c.group_ids)),
  ];

  // Fetch profiles and groups in parallel
  const [profileLookup, groupLookup] = await Promise.all([
    fetchProfilesByIds(allUserIds),
    fetchGroupsByIds(allGroupIds),
  ]);

  // Build counterparty entries
  const counterparties: DashboardCounterpartyBalance[] = raw.counterparties.map(
    (entry) => {
      const profile = profileLookup.get(entry.user_id);
      const groupNames = entry.group_ids
        .map((gid) => groupLookup.get(gid)?.name)
        .filter((name): name is string => name != null);

      // Use the first group as the settle group
      const settleGroupId = entry.group_ids[0] ?? "";
      const settleGroupName = groupLookup.get(settleGroupId)?.name ?? "";

      return {
        userId: entry.user_id,
        name: profile?.name ?? "Unknown",
        email: profile?.email ?? "",
        avatarUrl: profile?.avatar_url ?? null,
        netBalance: entry.net_balance,
        groupCount: entry.group_ids.length,
        groupLabel: buildGroupLabel(groupNames),
        lastActivityAt: new Date().toISOString(),
        settleGroupId,
        settleGroupName,
      };
    },
  );

  return {
    summary: {
      currency: "USD",
      totalOwed: raw.summary.total_owed,
      totalYouOwe: raw.summary.total_you_owe,
      netBalance: raw.summary.net_balance,
      updatedAt: new Date().toISOString(),
    },
    counterparties,
  };
}
