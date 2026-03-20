import "server-only";

import { createClient } from "@/lib/supabase/server";
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
    throw new Error(
      `Failed to calculate group balances: ${rpcError.message}`,
    );
  }

  const raw = rpcData as unknown as RawGroupBalancesResponse;

  // 2. If there are no balances, return early with empty arrays
  if (raw.balances.length === 0) {
    return { balances: [], simplifiedDebts: [] };
  }

  // 3. Fetch group members with profile data to enrich the balance entries
  const userIds = raw.balances.map((b) => b.user_id);

  const { data: members, error: membersError } = await supabase
    .from("group_members")
    .select("user_id, role, profiles(name, email, avatar_url)")
    .eq("group_id", groupId)
    .in("user_id", userIds);

  if (membersError) {
    throw new Error(
      `Failed to fetch group member profiles: ${membersError.message}`,
    );
  }

  // 4. Build a lookup map from user_id to member + profile data
  const memberLookup = new Map<
    string,
    { name: string; email: string; avatarUrl: string | null; role: string }
  >();

  for (const member of members) {
    // Supabase returns the joined profile as an object (single relation via FK)
    const profile = member.profiles as unknown as {
      name: string;
      email: string;
      avatar_url: string | null;
    } | null;

    memberLookup.set(member.user_id, {
      name: profile?.name ?? "Unknown",
      email: profile?.email ?? "",
      avatarUrl: profile?.avatar_url ?? null,
      role: member.role,
    });
  }

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
