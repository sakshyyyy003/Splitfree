import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { GroupMember } from "@/types/group-detail";

export async function getGroupMembers(
  groupId: string,
): Promise<GroupMember[]> {
  if (!groupId) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_members")
    .select("user_id, role, joined_at, profiles(name, email, avatar_url)")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch group members: ${error.message}`);
  }

  return data.map((member) => {
    const profile = member.profiles as unknown as {
      name: string;
      email: string;
      avatar_url: string | null;
    } | null;

    return {
      userId: member.user_id,
      name: profile?.name ?? "Unknown",
      email: profile?.email ?? "",
      avatarUrl: profile?.avatar_url ?? null,
      role: member.role as "admin" | "member",
      joinedAt: member.joined_at,
    };
  });
}
