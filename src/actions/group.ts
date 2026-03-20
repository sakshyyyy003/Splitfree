"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  createGroupSchema,
  coverImageSchema,
  type CreateGroupInput,
} from "@/lib/validators/group";
import {
  addMemberSchema,
  removeMemberSchema,
  type AddMemberInput,
  type RemoveMemberInput,
} from "@/lib/validators/group-member";
import type { ActionResult } from "@/actions/auth";

const COVERS_BUCKET = "group-covers";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return extensions[mimeType] ?? "jpg";
}

export async function createGroup(
  input: CreateGroupInput,
  coverFormData?: FormData,
): Promise<ActionResult<{ groupId: string }>> {
  const parsed = createGroupSchema.safeParse(input);

  if (!parsed.success) {
    return {
      data: null,
      error: {
        code: "validation_error",
        message: "Please check your input and try again",
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

  // Validate cover image early if provided
  let validatedCover: File | null = null;

  if (coverFormData) {
    const file = coverFormData.get("cover");
    const fileParsed = coverImageSchema.safeParse(file);

    if (!fileParsed.success) {
      return {
        data: null,
        error: {
          code: "validation_error",
          message: fileParsed.error.issues[0]?.message ?? "Invalid cover image",
        },
      };
    }

    validatedCover = fileParsed.data;
  }

  // Insert the group
  const inviteCode = generateInviteCode();

  const { data: group, error: insertError } = await supabase
    .from("groups")
    .insert({
      name: parsed.data.name,
      category: parsed.data.category,
      invite_code: inviteCode,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !group) {
    return {
      data: null,
      error: {
        code: "insert_failed",
        message: "Failed to create group. Please try again.",
      },
    };
  }

  // Upload cover image using group id as path (convention: {groupId}/cover.{ext})
  if (validatedCover) {
    const ext = getFileExtension(validatedCover.type);
    const filePath = `${group.id}/cover.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(COVERS_BUCKET)
      .upload(filePath, validatedCover, {
        cacheControl: "3600",
        contentType: validatedCover.type,
      });

    if (uploadError) {
      // Non-fatal: group was created, just log upload failure
      console.error("Cover image upload failed:", uploadError.message);
    }
  }

  // Add creator as admin member
  const { error: memberError } = await supabase
    .from("group_members")
    .insert({
      group_id: group.id,
      user_id: user.id,
      role: "admin",
    });

  if (memberError) {
    return {
      data: null,
      error: {
        code: "member_failed",
        message: "Group created but failed to add you as a member. Please try again.",
      },
    };
  }

  revalidatePath("/dashboard");

  return { data: { groupId: group.id }, error: null };
}

export async function regenerateInviteCode(
  groupId: string,
): Promise<ActionResult<{ inviteCode: string }>> {
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

  // Check the user is an admin of this group
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return {
      data: null,
      error: {
        code: "forbidden",
        message: "Only group admins can regenerate the invite code",
      },
    };
  }

  const newCode = generateInviteCode();

  const { error: updateError } = await supabase
    .from("groups")
    .update({ invite_code: newCode })
    .eq("id", groupId);

  if (updateError) {
    return {
      data: null,
      error: {
        code: "update_failed",
        message: "Failed to regenerate invite code. Please try again.",
      },
    };
  }

  revalidatePath(`/groups/${groupId}`);

  return { data: { inviteCode: newCode }, error: null };
}

export async function joinGroup(
  inviteCode: string,
): Promise<ActionResult<{ groupId: string }>> {
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

  // Look up group by invite code
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, name")
    .eq("invite_code", inviteCode)
    .single();

  if (groupError || !group) {
    return {
      data: null,
      error: {
        code: "not_found",
        message: "Invalid invite code. The group may no longer exist.",
      },
    };
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    // Already a member — just return the group id
    return { data: { groupId: group.id }, error: null };
  }

  // Add as member
  const { error: memberError } = await supabase
    .from("group_members")
    .insert({
      group_id: group.id,
      user_id: user.id,
      role: "member",
    });

  if (memberError) {
    return {
      data: null,
      error: {
        code: "join_failed",
        message: "Failed to join group. Please try again.",
      },
    };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/groups/${group.id}`);

  return { data: { groupId: group.id }, error: null };
}

export async function addMemberToGroup(
  input: AddMemberInput,
): Promise<ActionResult<null>> {
  const parsed = addMemberSchema.safeParse(input);

  if (!parsed.success) {
    return {
      data: null,
      error: {
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid input",
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

  // Check the caller is an admin of this group
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", parsed.data.groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return {
      data: null,
      error: {
        code: "forbidden",
        message: "Only group admins can add members",
      },
    };
  }

  // Idempotency: if the user is already a member, return success
  const { data: existing } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", parsed.data.groupId)
    .eq("user_id", parsed.data.userId)
    .single();

  if (existing) {
    return { data: null, error: null };
  }

  // Add as member
  const { error: insertError } = await supabase
    .from("group_members")
    .insert({
      group_id: parsed.data.groupId,
      user_id: parsed.data.userId,
      role: "member",
    });

  if (insertError) {
    return {
      data: null,
      error: {
        code: "insert_failed",
        message: "Failed to add member. Please try again.",
      },
    };
  }

  revalidatePath(`/groups/${parsed.data.groupId}`);

  return { data: null, error: null };
}

export async function removeMember(
  input: RemoveMemberInput,
): Promise<ActionResult<null>> {
  const parsed = removeMemberSchema.safeParse(input);

  if (!parsed.success) {
    return {
      data: null,
      error: {
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid input",
      },
    };
  }

  const { groupId, userId: targetUserId } = parsed.data;

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

  // Check the caller is an admin of this group
  const { data: callerMembership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!callerMembership || callerMembership.role !== "admin") {
    return {
      data: null,
      error: {
        code: "forbidden",
        message: "Only group admins can remove members",
      },
    };
  }

  // Prevent admins from removing themselves
  if (targetUserId === user.id) {
    return {
      data: null,
      error: {
        code: "forbidden",
        message: "You cannot remove yourself from the group",
      },
    };
  }

  // Verify the target user is actually a member of this group
  const { data: targetMembership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", targetUserId)
    .single();

  if (!targetMembership) {
    return {
      data: null,
      error: {
        code: "not_found",
        message: "This user is not a member of the group",
      },
    };
  }

  // Balance safety check: compute the target member's net balance
  // Balance = (amount paid for expenses) - (their share of expense splits)
  //         - (settlements they made) + (settlements received)
  const { data: expensesPaid } = await supabase
    .from("expenses")
    .select("amount")
    .eq("group_id", groupId)
    .eq("paid_by", targetUserId)
    .eq("is_deleted", false);

  const totalPaid = (expensesPaid ?? []).reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );

  // Get expense IDs for this group to query splits
  const { data: groupExpenses } = await supabase
    .from("expenses")
    .select("id")
    .eq("group_id", groupId)
    .eq("is_deleted", false);

  const expenseIds = (groupExpenses ?? []).map((e) => e.id);

  let totalOwed = 0;

  if (expenseIds.length > 0) {
    const { data: splits } = await supabase
      .from("expense_splits")
      .select("amount")
      .eq("user_id", targetUserId)
      .in("expense_id", expenseIds);

    totalOwed = (splits ?? []).reduce(
      (sum, split) => sum + split.amount,
      0,
    );
  }

  const { data: settlementsPaid } = await supabase
    .from("settlements")
    .select("amount")
    .eq("group_id", groupId)
    .eq("paid_by", targetUserId);

  const totalSettlementsPaid = (settlementsPaid ?? []).reduce(
    (sum, s) => sum + s.amount,
    0,
  );

  const { data: settlementsReceived } = await supabase
    .from("settlements")
    .select("amount")
    .eq("group_id", groupId)
    .eq("paid_to", targetUserId);

  const totalSettlementsReceived = (settlementsReceived ?? []).reduce(
    (sum, s) => sum + s.amount,
    0,
  );

  // Net balance: positive = owed money, negative = owes money
  const netBalance =
    totalPaid - totalOwed - totalSettlementsPaid + totalSettlementsReceived;

  // Round to avoid floating-point drift (same as balances.ts)
  const roundedBalance = Math.round(netBalance * 100) / 100;

  if (roundedBalance !== 0) {
    return {
      data: null,
      error: {
        code: "balance_not_zero",
        message:
          "This member has an outstanding balance. All debts must be settled before they can be removed.",
      },
    };
  }

  // Delete the member from the group
  const { error: deleteError } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", targetUserId);

  if (deleteError) {
    return {
      data: null,
      error: {
        code: "delete_failed",
        message: "Failed to remove member. Please try again.",
      },
    };
  }

  revalidatePath(`/groups/${groupId}`);

  return { data: null, error: null };
}
