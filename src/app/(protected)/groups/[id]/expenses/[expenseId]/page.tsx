import { notFound } from "next/navigation";

import { ExpenseDetailView } from "@/components/groups/expense-detail-view";
import { requireAuthenticatedUser } from "@/lib/auth/user";
import { getExpenseDetail } from "@/lib/queries/expenses";
import { getGroupDetail } from "@/lib/queries/group";
import { getGroupMembers } from "@/lib/queries/group-members";

type ExpenseDetailPageProps = {
  params: Promise<{
    id: string;
    expenseId: string;
  }>;
};

export default async function ExpenseDetailPage({
  params,
}: ExpenseDetailPageProps) {
  const { id, expenseId } = await params;

  const [user, group, expense] = await Promise.all([
    requireAuthenticatedUser(),
    getGroupDetail(id),
    getExpenseDetail(id, expenseId),
  ]);

  if (!group || !expense) {
    notFound();
  }

  const members = await getGroupMembers(id);

  const isExpenseCreator = expense.createdByUserId === user.id;
  const isGroupAdmin =
    members.find((member) => member.userId === user.id)?.role === "admin";
  const canDelete = isExpenseCreator || isGroupAdmin;

  return (
    <ExpenseDetailView group={group} expense={expense} canDelete={canDelete} />
  );
}
