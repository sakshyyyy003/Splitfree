import Link from "next/link";
import { ArrowLeft, Handshake, Plus } from "lucide-react";

import type { DashboardCounterpartyBalance } from "@/types/dashboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type PersonDetailViewProps = {
  person: DashboardCounterpartyBalance;
  currency: string;
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function formatCurrency(amount: number, currency: string) {
  if (currency === "INR") return currencyFormatter.format(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function PersonDetailView({ person, currency }: PersonDetailViewProps) {
  const { netBalance } = person;
  const activeBreakdowns = person.breakdowns.filter((b) => b.amount !== 0);

  return (
    <div className="space-y-8">
      <section>
        <Link
          href="/dashboard?tab=people"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to people
        </Link>

        <div className="mt-10 flex flex-col gap-[6px]">
          <div className="flex items-center justify-between px-1 py-2">
            <div className="flex items-center gap-4">
              <Avatar className="size-12">
                {person.avatarUrl ? (
                  <AvatarImage src={person.avatarUrl} alt={person.name} />
                ) : null}
                <AvatarFallback className="text-base">
                  {getInitials(person.name)}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-[28px] font-bold leading-10 tracking-[-0.9px]">
                {person.name}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {netBalance !== 0 && (
                <Link
                  href={`/expenses/direct/settle?with=${person.userId}`}
                  className="inline-flex h-8 items-center justify-center gap-1.5 border border-primary bg-primary px-3 text-xs font-bold uppercase whitespace-nowrap text-primary-foreground transition-all outline-none select-none hover:bg-primary/92 active:translate-y-px sm:h-9"
                >
                  <Handshake className="size-4 sm:hidden" />
                  <span className="hidden sm:inline">Settle Up</span>
                </Link>
              )}
              <Link
                href={`/expenses/direct/new?with=${person.userId}`}
                className="inline-flex h-8 items-center justify-center gap-1.5 border border-foreground bg-background px-3 text-xs font-bold uppercase whitespace-nowrap text-foreground transition-all outline-none select-none hover:bg-secondary active:translate-y-px sm:h-9"
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">Add Expense</span>
              </Link>
            </div>
          </div>

          <div className="px-[5px]">
            <p className="text-[18px] leading-7">
              <span className="font-medium">
                {netBalance > 0
                  ? "Overall, you'll get "
                  : netBalance < 0
                    ? "Overall, you owe "
                    : "All settled up"}
              </span>
              {netBalance !== 0 && (
                <span
                  className={`font-bold ${netBalance > 0 ? "text-[#007a55]" : "text-rose-700"}`}
                >
                  {formatCurrency(Math.abs(netBalance), currency)}
                </span>
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground px-1">
          Expenses
        </p>

        {activeBreakdowns.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center">
            <p className="text-sm font-semibold text-muted-foreground">
              All settled up
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              No outstanding balances with {person.name}.
            </p>
          </div>
        ) : (
          activeBreakdowns.map((breakdown) => {
            const isOwed = breakdown.amount > 0;
            const isDirect = breakdown.groupId === null;

            const sourceLabel = isDirect ? "Direct Expense" : (breakdown.groupName ?? "Unknown Group");
            const sourceContent = isDirect ? (
              <p className="text-base font-bold">{sourceLabel}</p>
            ) : (
              <Link
                href={`/groups/${breakdown.groupId}`}
                className="text-base font-bold hover:underline underline-offset-2"
              >
                {sourceLabel}
              </Link>
            );

            return (
              <div
                key={breakdown.groupId ?? "direct"}
                className="flex items-center justify-between rounded-none border border-border bg-white px-5 py-4"
              >
                <div>
                  {sourceContent}
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {isDirect ? "Direct" : "Group"}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-base font-bold ${isOwed ? "text-[#007a55]" : "text-rose-700"}`}
                  >
                    {formatCurrency(Math.abs(breakdown.amount), currency)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {isOwed ? "you get" : "you owe"}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
