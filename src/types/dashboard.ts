export type DashboardUser = {
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
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
