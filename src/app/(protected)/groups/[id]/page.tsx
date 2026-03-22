import { notFound } from "next/navigation";

import { requireAuthenticatedUser } from "@/lib/auth/user";
import { getGroupBalances } from "@/lib/queries/balances";
import { getGroupExpenses } from "@/lib/queries/expenses";
import { getGroupDetail } from "@/lib/queries/group";
import { getGroupMembers } from "@/lib/queries/group-members";
import { getGroupSettlements } from "@/lib/queries/settlements";
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

  const [group, expenses, balanceSummary, members, settlements] = await Promise.all([
    getGroupDetail(id),
    getGroupExpenses(id, user.id),
    getGroupBalances(id),
    getGroupMembers(id),
    getGroupSettlements(id),
  ]);

  if (!group) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[800px]">
      <GroupDetailView
        group={group}
        expenses={expenses}
        settlements={settlements}
        balances={balanceSummary.balances}
        simplifiedDebts={balanceSummary.simplifiedDebts}
        members={members}
        currentUserId={user.id}
      />
    </div>
  );
}
