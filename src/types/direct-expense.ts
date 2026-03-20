/**
 * Types for the direct (1:1, non-group) expense list view.
 *
 * Mirrors the `GroupExpense` shape from `group-detail.ts` but replaces
 * group-specific fields with counterparty profile information.
 */

export type CounterpartyProfile = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

export type DirectExpense = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  paidByUserId: string;
  paidByName: string;
  counterparty: CounterpartyProfile;
  splitSummary: string;
  incurredOn: string;
  createdAt: string;
  notes: string | null;
};
