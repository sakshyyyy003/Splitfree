"use server";

import { getActivityFeed } from "@/lib/queries/activity";
import type { ActivityFeedResult } from "@/types/activity";

export async function loadMoreActivity(
  cursor: string,
): Promise<ActivityFeedResult> {
  return getActivityFeed(cursor);
}
