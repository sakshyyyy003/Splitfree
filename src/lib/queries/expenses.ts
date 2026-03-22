import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SplitType } from "@/lib/algorithms/splits";
import type {
  GroupExpense,
  GroupExpenseDetail,
  ExpenseSplitParticipant,
} from "@/types/group-detail";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

type ExpenseSplitForEdit = {
  user_id: string;
  amount: number;
  share_value: number | null;
};

export type ExpenseForEdit = {
  id: string;
  group_id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  paid_by: string;
  created_by: string;
  split_type: SplitType;
  category: string;
  notes: string | null;
  image_url: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  updated_at: string;
  splits: ExpenseSplitForEdit[];
};

// -------------------------------------------------------
// Query
// -------------------------------------------------------

/**
 * Fetches a single expense with its splits, shaped for the edit form.
 *
 * Returns `null` when the expense does not exist, belongs to a different
 * group, or has been soft-deleted.  The `updated_at` field is included
 * so the caller can pass it as the optimistic-lock token when updating.
 */
export async function getExpenseForEdit(
  groupId: string,
  expenseId: string,
): Promise<ExpenseForEdit | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .select(
      `
      id,
      group_id,
      description,
      amount,
      currency,
      date,
      paid_by,
      created_by,
      split_type,
      category,
      notes,
      image_url,
      is_recurring,
      recurrence_rule,
      updated_at,
      expense_splits (
        user_id,
        amount,
        share_value
      )
    `,
    )
    .eq("id", expenseId)
    .eq("group_id", groupId)
    .eq("is_deleted", false)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    group_id: data.group_id!,
    description: data.description,
    amount: data.amount,
    currency: data.currency,
    date: data.date,
    paid_by: data.paid_by,
    created_by: data.created_by,
    split_type: data.split_type as SplitType,
    category: data.category,
    notes: data.notes,
    image_url: data.image_url,
    is_recurring: data.is_recurring,
    recurrence_rule: data.recurrence_rule,
    updated_at: data.updated_at,
    splits: data.expense_splits.map((split) => ({
      user_id: split.user_id,
      amount: split.amount,
      share_value: split.share_value,
    })),
  };
}

// -------------------------------------------------------
// Group expenses list
// -------------------------------------------------------

function buildSplitSummary(
  splitType: string,
  participantCount: number,
): string {
  const label =
    ({
      equal: "equally",
      exact: "by exact amounts",
      percentage: "by percentage",
      shares: "by shares",
    } as Record<string, string>)[splitType] ?? "equally";
  return `Split ${label} among ${participantCount} ${participantCount === 1 ? "person" : "people"}`;
}

export async function getGroupExpenses(
  groupId: string,
  currentUserId: string,
): Promise<GroupExpense[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .select(
      `
      id,
      description,
      amount,
      currency,
      category,
      paid_by,
      split_type,
      date,
      notes,
      created_at,
      profiles!expenses_paid_by_fkey (name),
      expense_splits (user_id, amount)
    `,
    )
    .eq("group_id", groupId)
    .eq("is_deleted", false)
    .order("date", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const userSplit = row.expense_splits.find(
      (split) => split.user_id === currentUserId,
    );
    const userOwed = userSplit?.amount ?? 0;
    // If the current user paid, they get back (total - their share).
    // If someone else paid, the current user owes their share.
    const currentUserBalance =
      row.paid_by === currentUserId
        ? row.amount - userOwed
        : -userOwed;

    const isSelfExpense =
      row.paid_by === currentUserId &&
      row.expense_splits.length === 1 &&
      row.expense_splits[0].user_id === currentUserId;

    return {
      id: row.id,
      title: row.description,
      amount: row.amount,
      currency: row.currency,
      category: row.category,
      paidByUserId: row.paid_by,
      paidByName:
        (row.profiles as unknown as { name: string } | null)?.name ?? "Unknown",
      splitSummary: buildSplitSummary(row.split_type, row.expense_splits.length),
      incurredOn: row.date,
      createdAt: row.created_at,
      notes: row.notes,
      currentUserBalance,
      isSelfExpense,
    };
  });
}

// -------------------------------------------------------
// Single expense detail
// -------------------------------------------------------

export async function getExpenseDetail(
  groupId: string,
  expenseId: string,
  currentUserId: string,
): Promise<GroupExpenseDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .select(
      `
      id,
      group_id,
      description,
      amount,
      currency,
      category,
      paid_by,
      created_by,
      split_type,
      date,
      notes,
      created_at,
      profiles!expenses_paid_by_fkey (name),
      expense_splits (
        user_id,
        amount,
        share_value
      )
    `,
    )
    .eq("id", expenseId)
    .eq("group_id", groupId)
    .eq("is_deleted", false)
    .single();

  if (error || !data) return null;

  // Batch-fetch profiles for all split participants
  const participantIds = data.expense_splits.map((s) => s.user_id);

  const { data: profiles } =
    participantIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, name, email, avatar_url")
          .in("id", participantIds)
      : { data: [] };

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p]),
  );

  const participants: ExpenseSplitParticipant[] = data.expense_splits.map(
    (split) => {
      const profile = profileMap.get(split.user_id);
      return {
        userId: split.user_id,
        name: profile?.name ?? "Unknown",
        email: profile?.email ?? "",
        avatarUrl: profile?.avatar_url ?? null,
        paidAmount: split.user_id === data.paid_by ? data.amount : 0,
        owedAmount: split.amount,
      };
    },
  );

  const paidByName =
    (data.profiles as unknown as { name: string } | null)?.name ?? "Unknown";

  return {
    id: data.id,
    groupId: data.group_id!,
    title: data.description,
    amount: data.amount,
    currency: data.currency,
    category: data.category,
    paidByUserId: data.paid_by,
    paidByName,
    createdByUserId: data.created_by,
    splitType: data.split_type as GroupExpenseDetail["splitType"],
    splitSummary: buildSplitSummary(
      data.split_type,
      data.expense_splits.length,
    ),
    incurredOn: data.date,
    createdAt: data.created_at,
    notes: data.notes,
    currentUserBalance: (() => {
      const userSplit = data.expense_splits.find(
        (s) => s.user_id === currentUserId,
      );
      const userOwed = userSplit?.amount ?? 0;
      return data.paid_by === currentUserId
        ? data.amount - userOwed
        : -userOwed;
    })(),
    isSelfExpense:
      data.paid_by === currentUserId &&
      data.expense_splits.length === 1 &&
      data.expense_splits[0].user_id === currentUserId,
    participants,
  };
}
