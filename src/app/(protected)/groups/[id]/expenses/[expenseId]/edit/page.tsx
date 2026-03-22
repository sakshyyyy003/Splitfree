import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireAuthenticatedUser } from "@/lib/auth/user";
import { getExpenseForEdit } from "@/lib/queries/expenses";
import { getGroupMembers } from "@/lib/queries/group-members";
import { ExpenseForm } from "@/components/expenses/expense-form";

type EditExpensePageProps = {
  params: Promise<{
    id: string;
    expenseId: string;
  }>;
};

export default async function EditExpensePage({
  params,
}: EditExpensePageProps) {
  const [{ id: groupId, expenseId }, user] = await Promise.all([
    params,
    requireAuthenticatedUser(),
  ]);

  const [expense, members] = await Promise.all([
    getExpenseForEdit(groupId, expenseId),
    getGroupMembers(groupId),
  ]);

  if (!expense) {
    notFound();
  }

  // Authorization: only the expense creator or a group admin can edit
  const isExpenseCreator = expense.created_by === user.id;
  const isGroupAdmin =
    members.find((member) => member.userId === user.id)?.role === "admin";

  if (!isExpenseCreator && !isGroupAdmin) {
    redirect(`/groups/${groupId}/expenses/${expenseId}`);
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <Link
        href={`/groups/${groupId}/expenses/${expenseId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to expense
      </Link>

      <section className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Expenses
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Edit expense
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Update the expense details and how it is split among group members.
        </p>
      </section>

      <ExpenseForm
        groupId={groupId}
        members={members}
        currentUserId={user.id}
        mode="edit"
        initialData={expense}
        expectedUpdatedAt={expense.updated_at}
      />
    </div>
  );
}
