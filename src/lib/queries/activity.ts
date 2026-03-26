import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  ActivityAction,
  ActivityEntityType,
  ActivityEntry,
  ActivityFeedResult,
} from "@/types/activity";

const PAGE_SIZE = 20;

type RawActivityRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor_id: string;
  target_user_id: string | null;
  group_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type ProfileRow = {
  id: string;
  name: string;
  avatar_url: string | null;
};

type GroupRow = {
  id: string;
  name: string;
};

/**
 * Fetches a paginated activity feed for the current user.
 * RLS ensures only activity from the user's groups and direct
 * interactions is returned.
 * Filters out expense actions where the current user is the actor.
 * Batch-fetches the current user's share from expense_splits for expense entries.
 */
export async function getActivityFeed(
  cursor?: string | null,
  limit: number = PAGE_SIZE,
): Promise<ActivityFeedResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id;

  let query = supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit + 1); // fetch one extra to determine hasMore

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: rows, error } = await query;

  if (error || !rows) {
    return { entries: [], hasMore: false, nextCursor: null };
  }

  // Filter out expense actions where the current user is the actor
  const SELF_HIDDEN_ACTIONS: Set<string> = new Set([
    "expense_created",
    "expense_updated",
    "expense_deleted",
  ]);
  const filteredRows = currentUserId
    ? (rows as RawActivityRow[]).filter(
        (row) => !(SELF_HIDDEN_ACTIONS.has(row.action) && row.actor_id === currentUserId),
      )
    : (rows as RawActivityRow[]);

  const hasMore = filteredRows.length > limit;
  const pageRows = hasMore ? filteredRows.slice(0, limit) : filteredRows;

  if (pageRows.length === 0) {
    return { entries: [], hasMore: false, nextCursor: null };
  }

  // Collect unique profile IDs, group IDs, and expense entity IDs
  const profileIds = new Set<string>();
  const groupIds = new Set<string>();
  const expenseEntityIds = new Set<string>();

  for (const row of pageRows) {
    profileIds.add(row.actor_id);
    if (row.target_user_id) profileIds.add(row.target_user_id);
    if (row.group_id) groupIds.add(row.group_id);

    // For settlements, paid_by / paid_to may differ from actor/target
    if (row.entity_type === "settlement" && row.metadata) {
      const meta = row.metadata as { paid_by?: string; paid_to?: string };
      if (meta.paid_by) profileIds.add(meta.paid_by);
      if (meta.paid_to) profileIds.add(meta.paid_to);
    }

    // Collect expense IDs for batch-fetching user shares
    if (row.entity_type === "expense" && row.action !== "expense_deleted") {
      expenseEntityIds.add(row.entity_id);
    }
  }

  // Batch-fetch profiles, groups, and user shares in parallel
  const [profilesResult, groupsResult, splitsResult] = await Promise.all([
    profileIds.size > 0
      ? supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .in("id", [...profileIds])
      : { data: [] as ProfileRow[] },
    groupIds.size > 0
      ? supabase
          .from("groups")
          .select("id, name")
          .in("id", [...groupIds])
      : { data: [] as GroupRow[] },
    expenseEntityIds.size > 0 && currentUserId
      ? supabase
          .from("expense_splits")
          .select("expense_id, amount")
          .in("expense_id", [...expenseEntityIds])
          .eq("user_id", currentUserId)
      : { data: [] as { expense_id: string; amount: number }[] },
  ]);

  const profileMap = new Map(
    ((profilesResult.data ?? []) as ProfileRow[]).map((p) => [p.id, p]),
  );
  const groupMap = new Map(
    ((groupsResult.data ?? []) as GroupRow[]).map((g) => [g.id, g]),
  );
  const splitMap = new Map(
    ((splitsResult.data ?? []) as { expense_id: string; amount: number }[]).map(
      (s) => [s.expense_id, s.amount],
    ),
  );

  const resolveProfile = (id: string | null) => {
    if (!id) return null;
    const p = profileMap.get(id);
    if (!p) return null;
    return { userId: p.id, name: p.name, avatarUrl: p.avatar_url };
  };

  const entries: ActivityEntry[] = pageRows.map((row) => ({
    id: row.id,
    action: row.action as ActivityAction,
    entityType: row.entity_type as ActivityEntityType,
    entityId: row.entity_id,
    actor: resolveProfile(row.actor_id) ?? {
      userId: row.actor_id,
      name: "Unknown",
      avatarUrl: null,
    },
    targetUser: resolveProfile(row.target_user_id),
    group: row.group_id
      ? groupMap.get(row.group_id)
        ? { id: row.group_id, name: groupMap.get(row.group_id)!.name }
        : null
      : null,
    metadata: row.metadata as ActivityEntry["metadata"],
    createdAt: row.created_at,
    userShare: splitMap.get(row.entity_id) ?? null,
  }));

  const nextCursor = hasMore
    ? pageRows[pageRows.length - 1].created_at
    : null;

  return { entries, hasMore, nextCursor };
}
