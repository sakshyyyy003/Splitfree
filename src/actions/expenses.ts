"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  createExpenseWithSplitsSchema,
  createDirectExpenseSchema,
  updateExpenseWithSplitsSchema,
  deleteExpenseSchema,
  type CreateExpenseWithSplitsInput,
  type CreateDirectExpenseInput,
  type UpdateExpenseWithSplitsInput,
  type DeleteExpenseInput,
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
    console.error("[createExpense] RPC error:", {
      code: rpcError.code,
      message: rpcError.message,
      details: rpcError.details,
      hint: rpcError.hint,
    });
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

export async function createDirectExpense(
  input: CreateDirectExpenseInput,
): Promise<ActionResult<Expense>> {
  const parsed = createDirectExpenseSchema.safeParse(input);

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

  // Server-side enforcement: paid_by and created_by must be the authenticated user
  // The RLS insert policy requires created_by = auth.uid() AND paid_by = auth.uid()
  const expenseData = {
    ...parsed.data.expense,
    paid_by: user.id,
    created_by: user.id,
  };

  const { data, error: rpcError } = await supabase.rpc(
    "create_direct_expense_with_splits",
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
        message: "Failed to create direct expense. Please try again.",
      },
    };
  }

  const expense = data as unknown as Expense;

  revalidatePath("/dashboard");

  return { data: expense, error: null };
}

export async function updateExpense(
  input: UpdateExpenseWithSplitsInput,
): Promise<ActionResult<Expense>> {
  const parsed = updateExpenseWithSplitsSchema.safeParse(input);

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
    "update_expense_with_splits",
    {
      _expense_data: expenseData as unknown as Record<string, unknown>,
      _expense_id: parsed.data.expense_id,
      _expected_updated_at: parsed.data.expected_updated_at,
      _splits_data: parsed.data.splits as unknown as Record<string, unknown>[],
    },
  );

  if (rpcError) {
    if (rpcError.message.includes("Conflict:")) {
      return {
        data: null,
        error: {
          code: "conflict",
          message:
            "This expense was modified by another user. Please refresh and try again.",
        },
      };
    }

    return {
      data: null,
      error: {
        code: "update_failed",
        message: "Failed to update expense. Please try again.",
      },
    };
  }

  const expense = data as unknown as Expense;

  if (expense.group_id) {
    revalidatePath(`/groups/${expense.group_id}`);
  }

  return { data: expense, error: null };
}

export async function deleteExpense(
  input: DeleteExpenseInput,
): Promise<ActionResult<null>> {
  const parsed = deleteExpenseSchema.safeParse(input);

  if (!parsed.success) {
    return {
      data: null,
      error: {
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid input",
      },
    };
  }

  const { expense_id, group_id } = parsed.data;

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

  // Fetch the expense to verify it exists and is not already deleted
  const { data: expense, error: fetchError } = await supabase
    .from("expenses")
    .select("id, created_by, group_id, is_deleted")
    .eq("id", expense_id)
    .single();

  if (fetchError || !expense) {
    return {
      data: null,
      error: { code: "not_found", message: "Expense not found" },
    };
  }

  if (expense.is_deleted) {
    return {
      data: null,
      error: { code: "already_deleted", message: "Expense is already deleted" },
    };
  }

  // Authorization: user must be the expense creator or a group admin
  if (expense.created_by !== user.id) {
    const { data: membership } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", group_id)
      .eq("user_id", user.id)
      .single();

    if (membership?.role !== "admin") {
      return {
        data: null,
        error: {
          code: "forbidden",
          message: "Only the expense creator or a group admin can delete this expense",
        },
      };
    }
  }

  // Soft-delete the expense
  const { error: updateError } = await supabase
    .from("expenses")
    .update({ is_deleted: true })
    .eq("id", expense_id)
    .select()
    .single();

  if (updateError) {
    return {
      data: null,
      error: {
        code: "delete_failed",
        message: "Failed to delete expense. Please try again.",
      },
    };
  }

  revalidatePath(`/groups/${group_id}`);

  return { data: null, error: null };
}
