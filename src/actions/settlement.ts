"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  settlementSchema,
  type SettlementInput,
} from "@/lib/validators/settlement";
import type { ActionResult } from "@/actions/auth";
import type { Tables } from "@/types/database";

type Settlement = Tables<"settlements">;

export async function recordSettlement(
  input: SettlementInput,
): Promise<ActionResult<Settlement>> {
  const parsed = settlementSchema.safeParse(input);

  if (!parsed.success) {
    return {
      data: null,
      error: {
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid settlement data",
      },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      data: null,
      error: { code: "unauthorized", message: "You must be signed in" },
    };
  }

  const { paid_by, paid_to } = parsed.data;

  if (user.id !== paid_by && user.id !== paid_to) {
    return {
      data: null,
      error: {
        code: "forbidden",
        message: "You must be either the payer or the recipient",
      },
    };
  }

  const groupId = parsed.data.group_id ?? null;

  // If settling from a group context, record a single group-scoped settlement
  if (groupId) {
    const { data, error: insertError } = await supabase
      .from("settlements")
      .insert({
        group_id: groupId,
        paid_by,
        paid_to,
        amount: parsed.data.amount,
        notes: parsed.data.notes ?? null,
      })
      .select()
      .single();

    if (insertError || !data) {
      return {
        data: null,
        error: {
          code: "create_failed",
          message: "Failed to record settlement. Please try again.",
        },
      };
    }

    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/dashboard");
    return { data, error: null };
  }

  // Settling from direct/People: cascade — exhaust direct debt first, overflow to group
  const totalAmount = parsed.data.amount;

  // 1. Compute direct debt: sum of direct expenses between these two users
  const directDebt = await computeDirectDebt(supabase, paid_by, paid_to);

  const directPortion = Math.min(totalAmount, Math.max(0, directDebt));
  const groupPortion = Math.round((totalAmount - directPortion) * 100) / 100;

  const inserts: {
    group_id: string | null;
    paid_by: string;
    paid_to: string;
    amount: number;
    notes: string | null;
  }[] = [];

  if (directPortion > 0) {
    inserts.push({
      group_id: null,
      paid_by,
      paid_to,
      amount: directPortion,
      notes: parsed.data.notes ?? null,
    });
  }

  if (groupPortion > 0) {
    // 2. Find the shared group with the largest debt in the same direction
    const targetGroupId = await findGroupWithLargestDebt(
      supabase,
      paid_by,
      paid_to,
    );

    if (targetGroupId) {
      inserts.push({
        group_id: targetGroupId,
        paid_by,
        paid_to,
        amount: groupPortion,
        notes: parsed.data.notes ?? null,
      });
    } else {
      // No matching group debt — record as direct
      inserts.push({
        group_id: null,
        paid_by,
        paid_to,
        amount: groupPortion,
        notes: parsed.data.notes ?? null,
      });
    }
  }

  if (inserts.length === 0) {
    return {
      data: null,
      error: {
        code: "create_failed",
        message: "No settlement amount to record.",
      },
    };
  }

  const { data, error: insertError } = await supabase
    .from("settlements")
    .insert(inserts)
    .select();

  if (insertError || !data || data.length === 0) {
    return {
      data: null,
      error: {
        code: "create_failed",
        message: "Failed to record settlement. Please try again.",
      },
    };
  }

  // Revalidate all affected group pages
  for (const record of data) {
    if (record.group_id) {
      revalidatePath(`/groups/${record.group_id}`);
    }
  }
  revalidatePath("/dashboard");

  return { data: data[0], error: null };
}

// -------------------------------------------------------
// Helpers for cascade settlement
// -------------------------------------------------------

/**
 * Compute the direct (non-group) debt that paid_by owes paid_to.
 * Returns a positive number if paid_by has a net debt to paid_to
 * in the direct context, or 0 if no debt / debt is in the other direction.
 */
async function computeDirectDebt(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paidBy: string,
  paidTo: string,
): Promise<number> {
  // Direct expenses where paid_by paid (credit for paid_by)
  const { data: creditExpenses } = await supabase
    .from("expenses")
    .select("id, amount")
    .is("group_id", null)
    .eq("paid_by", paidBy)
    .eq("is_deleted", false);

  // Direct expenses where paid_to paid (credit for paid_to)
  const { data: debitExpenses } = await supabase
    .from("expenses")
    .select("id, amount")
    .is("group_id", null)
    .eq("paid_by", paidTo)
    .eq("is_deleted", false);

  // Get splits for paid_to in expenses paid by paid_by
  const creditExpenseIds = (creditExpenses ?? []).map((e) => e.id);
  const { data: creditSplits } = creditExpenseIds.length
    ? await supabase
        .from("expense_splits")
        .select("amount")
        .eq("user_id", paidTo)
        .in("expense_id", creditExpenseIds)
    : { data: [] };

  // Get splits for paid_by in expenses paid by paid_to
  const debitExpenseIds = (debitExpenses ?? []).map((e) => e.id);
  const { data: debitSplits } = debitExpenseIds.length
    ? await supabase
        .from("expense_splits")
        .select("amount")
        .eq("user_id", paidBy)
        .in("expense_id", debitExpenseIds)
    : { data: [] };

  // Existing direct settlements
  const { data: settledOut } = await supabase
    .from("settlements")
    .select("amount")
    .is("group_id", null)
    .eq("paid_by", paidBy)
    .eq("paid_to", paidTo);

  const { data: settledIn } = await supabase
    .from("settlements")
    .select("amount")
    .is("group_id", null)
    .eq("paid_by", paidTo)
    .eq("paid_to", paidBy);

  // paid_to owes paid_by (from expenses paid_by paid)
  const owedToPaidBy = (creditSplits ?? []).reduce((s, r) => s + r.amount, 0);
  // paid_by owes paid_to (from expenses paid_to paid)
  const owedToPaidTo = (debitSplits ?? []).reduce((s, r) => s + r.amount, 0);
  // Already settled
  const alreadySettledOut = (settledOut ?? []).reduce((s, r) => s + r.amount, 0);
  const alreadySettledIn = (settledIn ?? []).reduce((s, r) => s + r.amount, 0);

  // Net direct debt from paid_by's perspective:
  // positive = paid_by owes paid_to in direct context
  const netDirect = owedToPaidTo - owedToPaidBy - alreadySettledOut + alreadySettledIn;

  return Math.round(Math.max(0, netDirect) * 100) / 100;
}

/**
 * Find the shared group where paid_by owes paid_to the most.
 * Returns the group_id or null if no group debt exists.
 */
async function findGroupWithLargestDebt(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paidBy: string,
  paidTo: string,
): Promise<string | null> {
  // Find groups where both users are members
  const { data: paidByGroups } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", paidBy);

  const { data: paidToGroups } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", paidTo);

  const paidByGroupIds = new Set((paidByGroups ?? []).map((g) => g.group_id));
  const sharedGroupIds = (paidToGroups ?? [])
    .map((g) => g.group_id)
    .filter((gid) => paidByGroupIds.has(gid));

  if (sharedGroupIds.length === 0) return null;

  // For each shared group, compute the debt paid_by owes paid_to
  let largestDebt = 0;
  let largestGroupId: string | null = null;

  for (const gid of sharedGroupIds) {
    // Expenses paid_to paid in this group (paid_by owes their split)
    const { data: expensesByPaidTo } = await supabase
      .from("expenses")
      .select("id")
      .eq("group_id", gid)
      .eq("paid_by", paidTo)
      .eq("is_deleted", false);

    const expIds = (expensesByPaidTo ?? []).map((e) => e.id);
    const { data: splits } = expIds.length
      ? await supabase
          .from("expense_splits")
          .select("amount")
          .eq("user_id", paidBy)
          .in("expense_id", expIds)
      : { data: [] };

    const owedInGroup = (splits ?? []).reduce((s, r) => s + r.amount, 0);

    // Expenses paid_by paid in this group (paid_to owes their split)
    const { data: expensesByPaidBy } = await supabase
      .from("expenses")
      .select("id")
      .eq("group_id", gid)
      .eq("paid_by", paidBy)
      .eq("is_deleted", false);

    const expIds2 = (expensesByPaidBy ?? []).map((e) => e.id);
    const { data: splits2 } = expIds2.length
      ? await supabase
          .from("expense_splits")
          .select("amount")
          .eq("user_id", paidTo)
          .in("expense_id", expIds2)
      : { data: [] };

    const owedBackInGroup = (splits2 ?? []).reduce((s, r) => s + r.amount, 0);

    // Group settlements already made
    const { data: settledOut } = await supabase
      .from("settlements")
      .select("amount")
      .eq("group_id", gid)
      .eq("paid_by", paidBy)
      .eq("paid_to", paidTo);

    const { data: settledIn } = await supabase
      .from("settlements")
      .select("amount")
      .eq("group_id", gid)
      .eq("paid_by", paidTo)
      .eq("paid_to", paidBy);

    const settled = (settledOut ?? []).reduce((s, r) => s + r.amount, 0);
    const settledReverse = (settledIn ?? []).reduce((s, r) => s + r.amount, 0);

    const netGroupDebt = owedInGroup - owedBackInGroup - settled + settledReverse;

    if (netGroupDebt > largestDebt) {
      largestDebt = netGroupDebt;
      largestGroupId = gid;
    }
  }

  return largestGroupId;
}

// -------------------------------------------------------
// Delete settlement
// -------------------------------------------------------

export async function deleteSettlement(
  settlementId: string,
  groupId: string | null,
): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      data: null,
      error: { code: "unauthorized", message: "You must be signed in" },
    };
  }

  // Verify the settlement exists and the user is involved
  const { data: settlement, error: fetchError } = await supabase
    .from("settlements")
    .select("id, paid_by, paid_to, group_id")
    .eq("id", settlementId)
    .single();

  if (fetchError || !settlement) {
    return {
      data: null,
      error: { code: "not_found", message: "Settlement not found" },
    };
  }

  if (settlement.paid_by !== user.id && settlement.paid_to !== user.id) {
    return {
      data: null,
      error: {
        code: "forbidden",
        message: "You can only delete settlements you are involved in",
      },
    };
  }

  const { error: deleteError } = await supabase
    .from("settlements")
    .delete()
    .eq("id", settlementId);

  if (deleteError) {
    return {
      data: null,
      error: {
        code: "delete_failed",
        message: "Failed to delete settlement. Please try again.",
      },
    };
  }

  if (settlement.group_id) {
    revalidatePath(`/groups/${settlement.group_id}`);
  }
  if (groupId) {
    revalidatePath(`/groups/${groupId}`);
  }
  revalidatePath("/dashboard");

  return { data: null, error: null };
}
