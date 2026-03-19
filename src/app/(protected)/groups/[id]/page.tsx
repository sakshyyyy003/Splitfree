import { notFound } from "next/navigation";

import {
  getMockGroupBalances,
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

  const [group, expenses, balances, members] = await Promise.all([
    getMockGroupDetail(id),
    getMockGroupExpenses(id),
    getMockGroupBalances(id),
    getMockGroupMembers(id),
  ]);

  if (!group) {
    notFound();
  }

  return (
    <GroupDetailView
      group={group}
      expenses={expenses}
      balances={balances}
      members={members}
    />
  );
}
