export type DashboardUser = {
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

export type DashboardOverallBalanceSummary = {
  currency: string;
  totalOwed: number;
  totalYouOwe: number;
  netBalance: number;
  updatedAt: string;
};

export type CounterpartyBreakdownEntry = {
  groupId: string | null; // null for direct expenses
  groupName: string | null; // null for direct expenses
  amount: number; // positive = they owe you, negative = you owe them
};

export type DashboardCounterpartyBalance = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  netBalance: number;
  groupCount: number;
  groupLabel: string;
  breakdowns: CounterpartyBreakdownEntry[];
  lastActivityAt: string;
  settleGroupId: string | null;
  settleGroupName: string | null;
};

export type DashboardOverallBalances = {
  summary: DashboardOverallBalanceSummary;
  counterparties: DashboardCounterpartyBalance[];
};

export type PersonDirectExpenseEntry = {
  expenseId: string;
  description: string;
  amount: number; // positive = they owe you, negative = you owe them
  date: string;
};

export type PersonGroupBreakdownEntry = {
  groupId: string;
  groupName: string;
  amount: number; // positive = they owe you, negative = you owe them
  latestExpenseDate: string | null;
};

export type PersonDetail = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  netBalance: number;
  directExpenses: PersonDirectExpenseEntry[];
  groupBreakdowns: PersonGroupBreakdownEntry[];
};

export type DashboardGroupCounterparty = {
  userId: string;
  name: string;
  amount: number; // positive = they owe you, negative = you owe them
};

export type DashboardGroup = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  currency: string;
  memberCount: number;
  netBalance: number;
  counterparties: DashboardGroupCounterparty[];
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};
