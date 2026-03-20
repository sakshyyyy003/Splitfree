"use server";

import { createClient } from "@/lib/supabase/server";
import {
  searchProfilesSchema,
  type SearchProfilesInput,
} from "@/lib/validators/search";
import type { ActionResult } from "@/actions/auth";
import type { Tables } from "@/types/database";

type ProfileResult = Pick<Tables<"profiles">, "id" | "name" | "email" | "avatar_url">;

const MAX_RESULTS = 10;

/**
 * Escape SQL LIKE/ILIKE wildcard characters (%, _) so user input
 * is treated as literal text rather than pattern syntax.
 */
function escapeLikePattern(value: string): string {
  return value.replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function searchProfiles(
  input: SearchProfilesInput,
): Promise<ActionResult<ProfileResult[]>> {
  const parsed = searchProfilesSchema.safeParse(input);

  if (!parsed.success) {
    return {
      data: null,
      error: {
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid search query",
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

  const escaped = escapeLikePattern(parsed.data.query);
  const pattern = `%${escaped}%`;

  const { data, error: queryError } = await supabase
    .from("profiles")
    .select("id, name, email, avatar_url")
    .or(`name.ilike.${pattern},email.ilike.${pattern}`)
    .neq("id", user.id)
    .limit(MAX_RESULTS);

  if (queryError) {
    return {
      data: null,
      error: {
        code: "search_failed",
        message: "Failed to search profiles. Please try again.",
      },
    };
  }

  return { data: data ?? [], error: null };
}
