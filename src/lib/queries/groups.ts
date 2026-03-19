import "server-only";

import { createClient } from "@/lib/supabase/server";

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

type GroupMemberRow = {
  group_id: string;
};

type ExpenseSplitRow = {
  user_id: string;
  amount: number;
};

type ExpenseRow = {
  group_id: string | null;
  amount: number;
  paid_by: string;
  expense_splits: ExpenseSplitRow[] | null;
};

type SettlementRow = {
  group_id: string | null;
  amount: number;
  paid_by: string;
  paid_to: string;
};

export type UserGroupSummary = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  currency: string;
  memberCount: number;
  netBalance: number;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function getUserGroups(userId: string): Promise<UserGroupSummary[]> {
  const supabase = await createClient();

  const { data: groups, error: groupsError } = await supabase
    .from("groups")
    .select(
      "id, name, description, category, currency, is_pinned, is_archived, created_at, updated_at",
    )
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (groupsError) {
    throw new Error(`Failed to fetch groups: ${groupsError.message}`);
  }

  if (!groups || groups.length === 0) {
    return [];
  }

  const typedGroups = groups as GroupRow[];
  const groupIds = typedGroups.map((group) => group.id);

  const [{ data: members, error: membersError }, { data: expenses, error: expensesError }, { data: settlements, error: settlementsError }] =
    await Promise.all([
      supabase.from("group_members").select("group_id").in("group_id", groupIds),
      supabase
        .from("expenses")
        .select("group_id, amount, paid_by, expense_splits(user_id, amount)")
        .in("group_id", groupIds)
        .eq("is_deleted", false),
      supabase
        .from("settlements")
        .select("group_id, amount, paid_by, paid_to")
        .in("group_id", groupIds),
    ]);

  if (membersError) {
    throw new Error(`Failed to fetch group members: ${membersError.message}`);
  }

  if (expensesError) {
    throw new Error(`Failed to fetch group expenses: ${expensesError.message}`);
  }

  if (settlementsError) {
    throw new Error(`Failed to fetch group settlements: ${settlementsError.message}`);
  }

  const memberCountByGroup = new Map<string, number>();

  for (const member of (members ?? []) as GroupMemberRow[]) {
    memberCountByGroup.set(
      member.group_id,
      (memberCountByGroup.get(member.group_id) ?? 0) + 1,
    );
  }

  const netBalanceByGroup = new Map<string, number>(
    groupIds.map((groupId) => [groupId, 0]),
  );

  for (const expense of (expenses ?? []) as ExpenseRow[]) {
    if (!expense.group_id) {
      continue;
    }

    const existingBalance = netBalanceByGroup.get(expense.group_id) ?? 0;
    const paidAmount = expense.paid_by === userId ? Number(expense.amount) : 0;
    const ownSplitAmount = Number(
      expense.expense_splits?.find((split) => split.user_id === userId)?.amount ??
        0,
    );

    netBalanceByGroup.set(
      expense.group_id,
      roundCurrency(existingBalance + paidAmount - ownSplitAmount),
    );
  }

  for (const settlement of (settlements ?? []) as SettlementRow[]) {
    if (!settlement.group_id) {
      continue;
    }

    const existingBalance = netBalanceByGroup.get(settlement.group_id) ?? 0;
    const paidByUser = settlement.paid_by === userId ? Number(settlement.amount) : 0;
    const paidToUser = settlement.paid_to === userId ? Number(settlement.amount) : 0;

    netBalanceByGroup.set(
      settlement.group_id,
      roundCurrency(existingBalance + paidByUser - paidToUser),
    );
  }

  return typedGroups.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    category: group.category,
    currency: group.currency,
    memberCount: memberCountByGroup.get(group.id) ?? 0,
    netBalance: roundCurrency(netBalanceByGroup.get(group.id) ?? 0),
    isPinned: group.is_pinned,
    isArchived: group.is_archived,
    createdAt: group.created_at,
    updatedAt: group.updated_at,
  }));
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
