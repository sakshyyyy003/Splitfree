import { notFound } from "next/navigation";

import {
  getMockGroupBalanceSummary,
  getMockGroupDetail,
  getMockGroupExpenses,
} from "@/lib/mock/group-detail";
import { requireAuthenticatedUser } from "@/lib/auth/user";
import { getGroupMembers } from "@/lib/queries/group-members";
import { GroupDetailView } from "@/components/groups/group-detail-view";

type GroupDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function GroupDetailPage({
  params,
}: GroupDetailPageProps) {
  const [{ id }, user] = await Promise.all([
    params,
    requireAuthenticatedUser(),
  ]);

  const [group, expenses, balanceSummary, members] = await Promise.all([
    getMockGroupDetail(id),
    getMockGroupExpenses(id),
    getMockGroupBalanceSummary(id),
    getGroupMembers(id),
  ]);

  if (!group) {
    notFound();
  }

  return (
    <GroupDetailView
      group={group}
      expenses={expenses}
      balances={balanceSummary.balances}
      simplifiedDebts={balanceSummary.simplifiedDebts}
      members={members}
      currentUserId={user.id}
    />
  );
}
