"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  createExpenseWithSplitsSchema,
  type CreateExpenseWithSplitsInput,
} from "@/lib/validators/expense";
import type { ActionResult } from "@/actions/auth";
import type { Tables } from "@/types/database";

type Expense = Tables<"expenses">;

export async function createExpense(
  input: CreateExpenseWithSplitsInput,
): Promise<ActionResult<Expense>> {
  const parsed = createExpenseWithSplitsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      data: null,
      error: {
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid expense data",
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

  // Server-side enforcement: override created_by with the authenticated user's ID
  const expenseData = {
    ...parsed.data.expense,
    created_by: user.id,
  };

  const { data, error: rpcError } = await supabase.rpc(
    "create_expense_with_splits",
    {
      _expense_data: expenseData as unknown as Record<string, unknown>,
      _splits_data: parsed.data.splits as unknown as Record<string, unknown>[],
    },
  );

  if (rpcError) {
    return {
      data: null,
      error: {
        code: "create_failed",
        message: "Failed to create expense. Please try again.",
      },
    };
  }

  const expense = data as unknown as Expense;

  if (expense.group_id) {
    revalidatePath(`/groups/${expense.group_id}`);
  }

  return { data: expense, error: null };
}
