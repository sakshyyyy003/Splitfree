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

export type DashboardCounterpartyBalance = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  netBalance: number;
  groupCount: number;
  groupLabel: string;
  lastActivityAt: string;
  settleGroupId: string;
  settleGroupName: string;
};

export type DashboardOverallBalances = {
  summary: DashboardOverallBalanceSummary;
  counterparties: DashboardCounterpartyBalance[];
};

export type DashboardGroup = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  currency: string;
  memberCount: number;
  netBalance: number;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};
