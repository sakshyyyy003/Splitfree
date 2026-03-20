import type { DashboardGroup } from "@/types/dashboard";

export type GroupDetail = DashboardGroup & {
  expenseCount: number;
  totalSpent: number;
  settledAmount: number;
  coverImageUrl: string | null;
};

export type GroupExpense = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  paidByUserId: string;
  paidByName: string;
  splitSummary: string;
  incurredOn: string;
  createdAt: string;
  notes: string | null;
};

export type ExpenseSplitParticipant = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  paidAmount: number;
  owedAmount: number;
};

export type GroupExpenseDetail = GroupExpense & {
  groupId: string;
  createdByUserId: string;
  splitType: "equal" | "exact" | "percentage" | "shares";
  participants: ExpenseSplitParticipant[];
};

export type GroupBalance = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: "admin" | "member";
  netBalance: number;
};

export type GroupSimplifiedDebt = {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
};

export type GroupBalanceSummary = {
  balances: GroupBalance[];
  simplifiedDebts: GroupSimplifiedDebt[];
};

export type GroupMember = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: "admin" | "member";
  joinedAt: string;
};

