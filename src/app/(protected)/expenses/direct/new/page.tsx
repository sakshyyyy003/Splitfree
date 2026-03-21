import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-textsec transition-colors hover:text-black"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Add a direct expense
        </h1>
      </section>

      <DirectExpenseForm
        currentUserId={user.id}
        currentUserName={displayName}
      />
    </div>
  );
}
