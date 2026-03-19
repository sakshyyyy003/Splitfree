import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getGroupByInviteCode(inviteCode: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("groups")
    .select("id, name, category, created_at")
    .eq("invite_code", inviteCode)
    .single();

  if (error) {
    return null;
  }

  return data;
}
