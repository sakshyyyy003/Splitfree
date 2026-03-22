"use server";

import { createClient } from "@/lib/supabase/server";
import {
  searchProfilesSchema,
  type SearchProfilesInput,
} from "@/lib/validators/search";
import type { ActionResult } from "@/actions/auth";
import type { Tables } from "@/types/database";

export type ProfileResult = Pick<Tables<"profiles">, "id" | "name" | "email" | "avatar_url">;

export type GroupResult = Pick<Tables<"groups">, "id" | "name" | "category">;

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

export async function searchGroups(
  input: SearchProfilesInput,
): Promise<ActionResult<GroupResult[]>> {
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

  // Only return groups the user is a member of
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, groups(id, name, category)")
    .eq("user_id", user.id)
    .ilike("groups.name", pattern)
    .limit(MAX_RESULTS);

  if (!memberships) {
    return { data: [], error: null };
  }

  const groups = memberships
    .map((m) => m.groups as unknown as GroupResult)
    .filter(Boolean);

  return { data: groups, error: null };
}

export type GroupMemberResult = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
};

export async function fetchGroupMembers(
  groupId: string,
): Promise<ActionResult<GroupMemberResult[]>> {
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

  const { data, error: queryError } = await supabase
    .from("group_members")
    .select("user_id, profiles(id, name, email, avatar_url)")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });

  if (queryError) {
    return {
      data: null,
      error: {
        code: "fetch_failed",
        message: "Failed to fetch group members.",
      },
    };
  }

  const members = data
    .map((m) => {
      const profile = m.profiles as unknown as GroupMemberResult | null;
      if (!profile) return null;
      return profile;
    })
    .filter(Boolean) as GroupMemberResult[];

  return { data: members, error: null };
}
