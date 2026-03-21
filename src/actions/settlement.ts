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

  if (groupId) {
    revalidatePath(`/groups/${groupId}`);
  }
  revalidatePath("/dashboard");

  return { data, error: null };
}
