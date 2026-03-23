import { notFound } from "next/navigation";

import { getGroupBalances } from "@/lib/queries/balances";
import { getGroupExpenses } from "@/lib/queries/expenses";
import { getGroupDetail } from "@/lib/queries/group";
import { getGroupMembers } from "@/lib/queries/group-members";
import { getGroupSettlements } from "@/lib/queries/settlements";
import { GroupDetailView } from "@/components/groups/group-detail-view";

type GroupDetailContentProps = {
  groupId: string;
  userId: string;
};

export async function GroupDetailContent({ groupId, userId }: GroupDetailContentProps) {
  const [group, expenses, balanceSummary, members, settlements] = await Promise.all([
    getGroupDetail(groupId, userId),
    getGroupExpenses(groupId, userId),
    getGroupBalances(groupId),
    getGroupMembers(groupId),
    getGroupSettlements(groupId),
  ]);

  if (!group) {
    notFound();
  }

  return (
    <GroupDetailView
      group={group}
      expenses={expenses}
      settlements={settlements}
      balances={balanceSummary.balances}
      simplifiedDebts={balanceSummary.simplifiedDebts}
      members={members}
      currentUserId={userId}
    />
  );
}
