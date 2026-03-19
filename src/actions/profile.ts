"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  updateProfileSchema,
  avatarFileSchema,
  type UpdateProfileInput,
} from "@/lib/validators/profile";
import type { ActionResult } from "@/actions/auth";

const AVATARS_BUCKET = "avatars";

function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return extensions[mimeType] ?? "jpg";
}

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<ActionResult<null>> {
  const parsed = updateProfileSchema.safeParse(input);

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

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .eq("id", user.id);

  if (updateError) {
    return {
      data: null,
      error: {
        code: "update_failed",
        message: "Failed to update profile. Please try again.",
      },
    };
  }

  revalidatePath("/profile");

  return { data: null, error: null };
}

export async function uploadAvatar(
  formData: FormData,
): Promise<ActionResult<{ avatarUrl: string }>> {
  const file = formData.get("avatar");

  const parsed = avatarFileSchema.safeParse(file);

  if (!parsed.success) {
    return {
      data: null,
      error: {
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid file",
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

  const validatedFile = parsed.data;
  const ext = getFileExtension(validatedFile.type);
  const filePath = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(filePath, validatedFile, {
      cacheControl: "3600",
      contentType: validatedFile.type,
      upsert: true,
    });

  if (uploadError) {
    return {
      data: null,
      error: {
        code: "upload_failed",
        message: "Failed to upload avatar. Please try again.",
      },
    };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(filePath);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) {
    return {
      data: null,
      error: {
        code: "update_failed",
        message: "Avatar uploaded but failed to update profile. Please try again.",
      },
    };
  }

  revalidatePath("/profile");

  return { data: { avatarUrl: publicUrl }, error: null };
}
