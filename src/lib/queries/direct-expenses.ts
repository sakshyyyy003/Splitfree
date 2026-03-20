import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CounterpartyProfile, DirectExpense } from "@/types/direct-expense";

// -------------------------------------------------------
// Raw types matching the Supabase query shape
// -------------------------------------------------------

type RawSplit = {
  user_id: string;
  amount: number;
};

type RawPaidByProfile = {
  name: string;
} | null;

type RawDirectExpenseRow = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  paid_by: string;
  date: string;
  notes: string | null;
  created_at: string;
  profiles: RawPaidByProfile;
  expense_splits: RawSplit[];
};

type ProfileRow = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
};

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function buildSplitSummary(
  paidByName: string,
  counterpartyName: string,
): string {
  return `Split between ${paidByName} and ${counterpartyName}`;
}

async function fetchProfilesByIds(
  userIds: string[],
): Promise<Map<string, ProfileRow>> {
  if (userIds.length === 0) return new Map();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, avatar_url")
    .in("id", userIds);

  if (error) {
    throw new Error(`Failed to fetch profiles: ${error.message}`);
  }

  const lookup = new Map<string, ProfileRow>();
  for (const profile of data ?? []) {
    lookup.set(profile.id, profile);
  }
  return lookup;
}

// -------------------------------------------------------
// Query
// -------------------------------------------------------

/**
 * Fetches all non-deleted direct (1:1) expenses where the current
 * user is either the payer or a split participant.
 *
 * RLS on the `expenses` table already scopes results to the
 * authenticated user, so no explicit user-id filter is needed
 * in the query itself.
 *
 * Returns expenses sorted by date descending, with counterparty
 * profile info for the list view.
 */
export async function getDirectExpenses(): Promise<DirectExpense[]> {
  const supabase = await createClient();

  // 1. Get the authenticated user (needed to identify counterparty)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be signed in to view direct expenses");
  }

  // 2. Fetch direct expenses with payer profile and splits.
  //    RLS ensures only expenses the user can see are returned.
  const { data, error } = await supabase
    .from("expenses")
    .select(
      `
      id,
      description,
      amount,
      currency,
      category,
      paid_by,
      date,
      notes,
      created_at,
      profiles!expenses_paid_by_fkey (name),
      expense_splits (user_id, amount)
    `,
    )
    .is("group_id", null)
    .eq("is_deleted", false)
    .order("date", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch direct expenses: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  const rows = data as unknown as RawDirectExpenseRow[];

  // 3. Collect counterparty user IDs (the split participant who is not the current user)
  const counterpartyIds = new Set<string>();

  for (const row of rows) {
    for (const split of row.expense_splits) {
      if (split.user_id !== user.id) {
        counterpartyIds.add(split.user_id);
      }
    }
  }

  // 4. Batch-fetch counterparty profiles
  const profileLookup = await fetchProfilesByIds([...counterpartyIds]);

  // 5. Map to DirectExpense[]
  return rows.map((row) => {
    const paidByName = row.profiles?.name ?? "Unknown";

    // Find the counterparty (the other participant in the 2-person split)
    const counterpartySplit = row.expense_splits.find(
      (split) => split.user_id !== user.id,
    );
    const counterpartyId = counterpartySplit?.user_id ?? "";
    const counterpartyProfile = profileLookup.get(counterpartyId);

    const counterparty: CounterpartyProfile = {
      userId: counterpartyId,
      name: counterpartyProfile?.name ?? "Unknown",
      email: counterpartyProfile?.email ?? "",
      avatarUrl: counterpartyProfile?.avatar_url ?? null,
    };

    return {
      id: row.id,
      title: row.description,
      amount: row.amount,
      currency: row.currency,
      category: row.category,
      paidByUserId: row.paid_by,
      paidByName,
      counterparty,
      splitSummary: buildSplitSummary(paidByName, counterparty.name),
      incurredOn: row.date,
      createdAt: row.created_at,
      notes: row.notes,
    };
  });
}
