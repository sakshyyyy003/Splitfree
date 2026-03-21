import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireAuthenticatedUser } from "@/lib/auth/user";
import { getOverallBalances } from "@/lib/queries/balances";
import { DirectSettleForm } from "@/components/expenses/direct-settle-form";

type DirectSettlePageProps = {
  searchParams: Promise<{ with?: string }>;
};

export default async function DirectSettlePage({
  searchParams,
}: DirectSettlePageProps) {
  const [user, params, overallBalances] = await Promise.all([
    requireAuthenticatedUser(),
    searchParams,
    getOverallBalances(),
  ]);

  const counterpartyId = params.with;
  const counterparty = counterpartyId
    ? overallBalances.counterparties.find((c) => c.userId === counterpartyId)
    : null;

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <section className="space-y-2">
        <Link
          href="/dashboard?tab=people"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Settle up
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Record a direct payment to settle outstanding balances.
        </p>
      </section>

      <DirectSettleForm
        currentUserId={user.id}
        counterparties={overallBalances.counterparties}
        preselectedCounterpartyId={counterparty ? counterpartyId! : null}
      />
    </div>
  );
}
