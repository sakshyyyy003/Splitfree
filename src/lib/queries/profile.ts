import "server-only";

import { cache } from "react";

import { requireAuthenticatedUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import type { DashboardUser } from "@/types/dashboard";

export const getDashboardUser = cache(async (): Promise<DashboardUser> => {
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, avatar_url")
    .eq("id", user.id)
    .single();

  return {
    email: profile?.email ?? user.email ?? null,
    name: profile?.name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  };
});

export async function getProfile(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, avatar_url, description, created_at, updated_at")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  return data;
}
