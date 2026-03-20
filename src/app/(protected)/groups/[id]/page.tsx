import { notFound } from "next/navigation";

import {
  getMockGroupDetail,
  getMockGroupExpenses,
  getMockGroupMembers,
} from "@/lib/mock/group-detail";
import { getGroupBalances } from "@/lib/queries/balances";
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
    getGroupBalances(id),
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
