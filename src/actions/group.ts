"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  createGroupSchema,
  coverImageSchema,
  type CreateGroupInput,
} from "@/lib/validators/group";
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
