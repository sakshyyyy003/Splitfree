import { requireAuthenticatedUser } from "@/lib/auth/user";
import { getProfile } from "@/lib/queries/profile";
import { DirectExpenseForm } from "@/components/expenses/direct-expense-form";

export default async function NewDirectExpensePage() {
  const user = await requireAuthenticatedUser();
  const profile = await getProfile(user.id);

  const displayName = profile.name ?? profile.email ?? "User";

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <section className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Expenses
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Add a direct expense
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Record a one-on-one expense with someone outside of a group and choose
          how to split it.
        </p>
      </section>

      <DirectExpenseForm
        currentUserId={user.id}
        currentUserName={displayName}
      />
    </div>
  );
}
