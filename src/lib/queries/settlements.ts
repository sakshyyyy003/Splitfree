import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { GroupSettlement } from "@/types/group-detail";

type ProfileRow = { id: string; name: string };

export async function getGroupSettlements(
  groupId: string,
): Promise<GroupSettlement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("settlements")
    .select("id, amount, paid_by, paid_to, notes, created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  // Batch-fetch profiles for all payers and payees
  const userIds = [
    ...new Set(data.flatMap((s) => [s.paid_by, s.paid_to])),
  ];

  const { data: profiles } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, name")
          .in("id", userIds)
      : { data: [] };

  const profileMap = new Map<string, string>(
    (profiles ?? []).map((p: ProfileRow) => [p.id, p.name]),
  );

  return data.map((row) => ({
    id: row.id,
    amount: row.amount,
    paidByUserId: row.paid_by,
    paidByName: profileMap.get(row.paid_by) ?? "Unknown",
    paidToUserId: row.paid_to,
    paidToName: profileMap.get(row.paid_to) ?? "Unknown",
    notes: row.notes,
    createdAt: row.created_at,
  }));
}

export async function getSettlementDetail(
  settlementId: string,
): Promise<GroupSettlement | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("settlements")
    .select("id, amount, paid_by, paid_to, notes, created_at, group_id")
    .eq("id", settlementId)
    .single();

  if (error || !data) return null;

  const userIds = [data.paid_by, data.paid_to];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", userIds);

  const profileMap = new Map<string, string>(
    (profiles ?? []).map((p: ProfileRow) => [p.id, p.name]),
  );

  return {
    id: data.id,
    amount: data.amount,
    paidByUserId: data.paid_by,
    paidByName: profileMap.get(data.paid_by) ?? "Unknown",
    paidToUserId: data.paid_to,
    paidToName: profileMap.get(data.paid_to) ?? "Unknown",
    notes: data.notes,
    createdAt: data.created_at,
  };
}
