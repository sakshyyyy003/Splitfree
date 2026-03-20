import { notFound } from "next/navigation";

import {
  getMockGroupBalanceSummary,
  getMockGroupDetail,
  getMockGroupExpenses,
  getMockGroupMembers,
} from "@/lib/mock/group-detail";
import { GroupDetailView } from "@/components/groups/group-detail-view";

type GroupDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function GroupDetailPage({
  params,
}: GroupDetailPageProps) {
  const { id } = await params;

  const [group, expenses, balanceSummary, members] = await Promise.all([
    getMockGroupDetail(id),
    getMockGroupExpenses(id),
    getMockGroupBalanceSummary(id),
    getMockGroupMembers(id),
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
    />
  );
}
