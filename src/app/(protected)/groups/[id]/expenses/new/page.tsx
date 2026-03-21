import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
        <Link
          href={`/groups/${groupId}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-textsec transition-colors hover:text-black"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Add a new expense
        </h1>
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
