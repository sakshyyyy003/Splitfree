// -------------------------------------------------------
// Simplified debt algorithm (greedy net-balance matching)
//
// Pure function — no Next.js, Supabase, or server/client imports.
// All internal math uses integer-cent arithmetic to avoid
// floating-point drift.
//
// Mirrors the Postgres function in
// supabase/migrations/00006_create_calculate_group_balances.sql
// -------------------------------------------------------

// -------------------------------------------------------
// Types
// -------------------------------------------------------

/** A member's pre-computed net balance (positive = owed money, negative = owes money). */
export type MemberBalance = {
  userId: string;
  /** Positive = creditor (is owed), negative = debtor (owes). */
  balance: number;
};

/** A single simplified payment from one member to another. */
export type SimplifiedDebt = {
  fromUserId: string;
  toUserId: string;
  /** Always positive — the dollar amount the debtor pays the creditor. */
  amount: number;
};

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function toDollars(cents: number): number {
  return cents / 100;
}

// -------------------------------------------------------
// Core algorithm
// -------------------------------------------------------

/**
 * Compute simplified debts from an array of member net balances.
 *
 * Uses a greedy two-pointer algorithm that matches the largest creditor
 * with the largest debtor, settling the minimum of their balances each
 * iteration. Produces at most `n - 1` transactions.
 *
 * Sort order (parity with Postgres function):
 *   - Creditors: descending by balance
 *   - Debtors:   descending by absolute balance (most negative first)
 */
export function simplifyDebts(balances: MemberBalance[]): SimplifiedDebt[] {
  // Separate into creditors and debtors, working in integer cents
  const creditors: { userId: string; cents: number }[] = [];
  const debtors: { userId: string; cents: number }[] = [];

  for (const { userId, balance } of balances) {
    const cents = toCents(balance);

    if (cents > 0) {
      creditors.push({ userId, cents });
    } else if (cents < 0) {
      debtors.push({ userId, cents: Math.abs(cents) });
    }
    // Zero balances are excluded — nothing to settle
  }

  // Sort creditors descending by balance (largest creditor first)
  creditors.sort((a, b) => b.cents - a.cents);

  // Sort debtors descending by absolute balance (largest debtor first)
  debtors.sort((a, b) => b.cents - a.cents);

  // Greedy matching: two-pointer style
  const debts: SimplifiedDebt[] = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const settle = Math.min(creditors[i].cents, debtors[j].cents);

    if (settle > 0) {
      debts.push({
        fromUserId: debtors[j].userId,
        toUserId: creditors[i].userId,
        amount: toDollars(settle),
      });
    }

    creditors[i].cents -= settle;
    debtors[j].cents -= settle;

    if (creditors[i].cents === 0) {
      i++;
    }

    if (debtors[j].cents === 0) {
      j++;
    }
  }

  return debts;
}
