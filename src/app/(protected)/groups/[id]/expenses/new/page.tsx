import { requireAuthenticatedUser } from "@/lib/auth/user";
import { getGroupMembers } from "@/lib/queries/group-members";
import { ExpenseForm } from "@/components/expenses/expense-form";

type AddExpensePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AddExpensePage({ params }: AddExpensePageProps) {
  const [{ id: groupId }, user] = await Promise.all([
    params,
    requireAuthenticatedUser(),
  ]);

  const members = await getGroupMembers(groupId);

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <section className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Expenses
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Add a new expense
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Record a shared expense and choose how to split it among group members.
        </p>
      </section>

      <ExpenseForm
        groupId={groupId}
        members={members}
        currentUserId={user.id}
        mode="create"
      />
    </div>
  );
}
