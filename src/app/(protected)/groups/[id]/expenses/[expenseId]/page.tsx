import { notFound } from "next/navigation";

import { ExpenseDetailView } from "@/components/groups/expense-detail-view";
import {
  getMockExpenseDetail,
  getMockGroupDetail,
} from "@/lib/mock/group-detail";

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

  const [group, expense] = await Promise.all([
    getMockGroupDetail(id),
    getMockExpenseDetail(id, expenseId),
  ]);

  if (!group || !expense) {
    notFound();
  }

  return <ExpenseDetailView group={group} expense={expense} />;
}
