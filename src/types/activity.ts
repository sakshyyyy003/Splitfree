export type ActivityAction =
  | "expense_created"
  | "expense_updated"
  | "expense_deleted"
  | "settlement_recorded"
  | "member_added"
  | "member_removed";

export type ActivityEntityType = "expense" | "settlement" | "member";

export type ActivityActor = {
  userId: string;
  name: string;
  avatarUrl: string | null;
};

export type ActivityExpenseMetadata = {
  description: string;
  amount: number;
  currency: string;
  old_amount?: number;
  old_description?: string;
};

export type ActivitySettlementMetadata = {
  amount: number;
  paid_by: string;
  paid_to: string;
};

export type ActivityMemberMetadata = {
  member_name: string;
};

export type ActivityEntry = {
  id: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  actor: ActivityActor;
  targetUser: ActivityActor | null;
  group: { id: string; name: string } | null;
  metadata: ActivityExpenseMetadata | ActivitySettlementMetadata | ActivityMemberMetadata;
  createdAt: string;
};

export type ActivityFeedResult = {
  entries: ActivityEntry[];
  hasMore: boolean;
  nextCursor: string | null;
};
