import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { DashboardGroup } from "@/types/dashboard";
import type { GroupDetail } from "@/types/group-detail";

export async function getDashboardGroups(): Promise<DashboardGroup[]> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return [];

  // 1. Fetch all groups the user belongs to
  const { data: memberships } = await supabase
    .from("group_members")
    .select(
      "group_id, groups(id, name, description, category, currency, is_pinned, is_archived, created_at, updated_at)",
    )
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) return [];

  type GroupRow = {
    id: string;
    name: string;
    description: string | null;
    category: string;
    currency: string;
    is_pinned: boolean;
    is_archived: boolean;
    created_at: string;
    updated_at: string;
  };

  const groups = memberships
    .map((m) => m.groups as unknown as GroupRow)
    .filter(Boolean);

  const groupIds = groups.map((g) => g.id);
  if (groupIds.length === 0) return [];

  // 2. Batch-fetch member counts
  const { data: allMembers } = await supabase
    .from("group_members")
    .select("group_id")
    .in("group_id", groupIds);

  const memberCountMap = new Map<string, number>();
  for (const m of allMembers ?? []) {
    memberCountMap.set(m.group_id, (memberCountMap.get(m.group_id) ?? 0) + 1);
  }

  // 3. Batch-fetch balance data across all groups + per-group simplified debts
  const rpcPromises = groupIds.map(async (groupId) => {
    const { data, error } = await supabase.rpc("calculate_group_balances", {
      p_group_id: groupId,
    });
    if (error) return { groupId, debts: [] as { from: string; to: string; amount: number }[] };
    const raw = data as unknown as { simplified_debts?: { from: string; to: string; amount: number }[] };
    return { groupId, debts: raw?.simplified_debts ?? [] };
  });

  const [
    { data: expensesPaid },
    { data: allGroupExpenses },
    { data: settlementsPaid },
    { data: settlementsReceived },
    ...balanceResults
  ] = await Promise.all([
    supabase
      .from("expenses")
      .select("group_id, amount")
      .in("group_id", groupIds)
      .eq("paid_by", user.id)
      .eq("is_deleted", false),
    supabase
      .from("expenses")
      .select("id, group_id")
      .in("group_id", groupIds)
      .eq("is_deleted", false),
    supabase
      .from("settlements")
      .select("group_id, amount")
      .in("group_id", groupIds)
      .eq("paid_by", user.id),
    supabase
      .from("settlements")
      .select("group_id, amount")
      .in("group_id", groupIds)
      .eq("paid_to", user.id),
    ...rpcPromises,
  ]);

  // Build expense_id -> group_id map for attributing splits
  const expenseToGroup = new Map<string, string>();
  const expenseIds: string[] = [];
  for (const e of allGroupExpenses ?? []) {
    expenseToGroup.set(e.id, e.group_id);
    expenseIds.push(e.id);
  }

  // Fetch user's splits
  const { data: userSplits } =
    expenseIds.length > 0
      ? await supabase
          .from("expense_splits")
          .select("expense_id, amount")
          .eq("user_id", user.id)
          .in("expense_id", expenseIds)
      : { data: [] };

  // 4. Compute per-group net balance
  const balanceMap = new Map<string, number>();

  for (const e of expensesPaid ?? []) {
    balanceMap.set(e.group_id, (balanceMap.get(e.group_id) ?? 0) + e.amount);
  }
  for (const s of userSplits ?? []) {
    const gId = expenseToGroup.get(s.expense_id);
    if (gId) balanceMap.set(gId, (balanceMap.get(gId) ?? 0) - s.amount);
  }
  for (const s of settlementsPaid ?? []) {
    balanceMap.set(s.group_id, (balanceMap.get(s.group_id) ?? 0) + s.amount);
  }
  for (const s of settlementsReceived ?? []) {
    balanceMap.set(s.group_id, (balanceMap.get(s.group_id) ?? 0) - s.amount);
  }

  // 5. Build per-group counterparty breakdowns from simplified debts
  const debtUserIds = new Set<string>();
  for (const result of balanceResults) {
    for (const debt of result.debts) {
      if (debt.from === user.id) debtUserIds.add(debt.to);
      else if (debt.to === user.id) debtUserIds.add(debt.from);
    }
  }

  const { data: profiles } =
    debtUserIds.size > 0
      ? await supabase
          .from("profiles")
          .select("id, name")
          .in("id", [...debtUserIds])
      : { data: [] };

  const profileMap = new Map<string, string>();
  for (const p of profiles ?? []) {
    profileMap.set(p.id, p.name ?? "Unknown");
  }

  const counterpartyMap = new Map<
    string,
    { userId: string; name: string; amount: number }[]
  >();
  for (const result of balanceResults) {
    const counterparties: { userId: string; name: string; amount: number }[] = [];
    for (const debt of result.debts) {
      if (debt.from === user.id) {
        counterparties.push({
          userId: debt.to,
          name: profileMap.get(debt.to) ?? "Unknown",
          amount: -debt.amount,
        });
      } else if (debt.to === user.id) {
        counterparties.push({
          userId: debt.from,
          name: profileMap.get(debt.from) ?? "Unknown",
          amount: debt.amount,
        });
      }
    }
    counterpartyMap.set(result.groupId, counterparties);
  }

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    category: g.category,
    currency: g.currency,
    memberCount: memberCountMap.get(g.id) ?? 0,
    netBalance: Math.round((balanceMap.get(g.id) ?? 0) * 100) / 100,
    counterparties: counterpartyMap.get(g.id) ?? [],
    isPinned: g.is_pinned,
    isArchived: g.is_archived,
    createdAt: g.created_at,
    updatedAt: g.updated_at,
  }));
}

export async function getGroupDetail(
  groupId: string,
): Promise<GroupDetail | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  // Fetch group (RLS ensures only members can see it)
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select(
      "id, name, description, category, currency, is_pinned, is_archived, created_at, updated_at, invite_code",
    )
    .eq("id", groupId)
    .single();

  if (groupError || !group) return null;

  // Parallel queries for computed fields
  const [
    { count: memberCount },
    { data: expenses },
    { data: settlements },
    { data: expensesPaidByUser },
    { data: groupExpenseRows },
    { data: settlementsPaidByUser },
    { data: settlementsReceivedByUser },
    { data: coverFiles },
  ] = await Promise.all([
    supabase
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId),
    supabase
      .from("expenses")
      .select("id, amount")
      .eq("group_id", groupId)
      .eq("is_deleted", false),
    supabase
      .from("settlements")
      .select("amount")
      .eq("group_id", groupId),
    supabase
      .from("expenses")
      .select("amount")
      .eq("group_id", groupId)
      .eq("paid_by", user.id)
      .eq("is_deleted", false),
    supabase
      .from("expenses")
      .select("id")
      .eq("group_id", groupId)
      .eq("is_deleted", false),
    supabase
      .from("settlements")
      .select("amount")
      .eq("group_id", groupId)
      .eq("paid_by", user.id),
    supabase
      .from("settlements")
      .select("amount")
      .eq("group_id", groupId)
      .eq("paid_to", user.id),
    supabase.storage.from("group-covers").list(groupId, { limit: 10 }),
  ]);

  const expenseCount = (expenses ?? []).length;
  const totalSpent = (expenses ?? []).reduce((sum, e) => sum + e.amount, 0);
  const settledAmount = (settlements ?? []).reduce(
    (sum, s) => sum + s.amount,
    0,
  );

  // Compute user's net balance for this group
  const expenseIds = (groupExpenseRows ?? []).map((e) => e.id);

  const { data: userSplits } =
    expenseIds.length > 0
      ? await supabase
          .from("expense_splits")
          .select("amount")
          .eq("user_id", user.id)
          .in("expense_id", expenseIds)
      : { data: [] };

  const paid = (expensesPaidByUser ?? []).reduce(
    (sum, e) => sum + e.amount,
    0,
  );
  const owed = (userSplits ?? []).reduce((sum, s) => sum + s.amount, 0);
  const settPaid = (settlementsPaidByUser ?? []).reduce(
    (sum, s) => sum + s.amount,
    0,
  );
  const settReceived = (settlementsReceivedByUser ?? []).reduce(
    (sum, s) => sum + s.amount,
    0,
  );
  const netBalance =
    Math.round((paid - owed + settPaid - settReceived) * 100) / 100;

  // Resolve cover image URL from storage
  const coverFile = (coverFiles ?? []).find(
    (f) => f.name !== ".emptyFolderPlaceholder",
  );
  const coverImageUrl = coverFile
    ? supabase.storage
        .from("group-covers")
        .getPublicUrl(`${groupId}/${coverFile.name}`).data.publicUrl
    : null;

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    category: group.category,
    currency: group.currency,
    memberCount: memberCount ?? 0,
    netBalance,
    counterparties: [],
    isPinned: group.is_pinned,
    isArchived: group.is_archived,
    createdAt: group.created_at,
    updatedAt: group.updated_at,
    expenseCount,
    totalSpent: Math.round(totalSpent * 100) / 100,
    settledAmount: Math.round(settledAmount * 100) / 100,
    coverImageUrl,
    inviteCode: group.invite_code,
  };
}

export async function getGroupByInviteCode(inviteCode: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "lookup_group_by_invite_code",
    { _invite_code: inviteCode },
  );

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0];
}
