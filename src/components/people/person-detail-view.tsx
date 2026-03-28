import Link from "next/link";
import { ArrowLeft, Handshake, Plus } from "lucide-react";

import type { PersonDetail } from "@/types/dashboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type PersonDetailViewProps = {
  person: PersonDetail;
  currency: string;
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const monthFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "short",
});

const dayFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
});

function formatCurrency(amount: number, currency: string) {
  if (currency === "INR") return currencyFormatter.format(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function DateBlock({ dateStr }: { dateStr: string }) {
  const date = new Date(dateStr);
  return (
    <div className="shrink-0 text-[12px] font-medium uppercase leading-4 tracking-[2.16px] text-[#404040]/70">
      <p>{monthFormatter.format(date)}</p>
      <p>{dayFormatter.format(date)}</p>
    </div>
  );
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
  const { netBalance, directExpenses, groupBreakdowns } = person;
  const hasAnyExpenses = directExpenses.length > 0 || groupBreakdowns.length > 0;

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

        {!hasAnyExpenses ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center">
            <p className="text-sm font-semibold text-muted-foreground">
              All settled up
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              No outstanding balances with {person.name}.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {groupBreakdowns.map((group) => {
              const isOwed = group.amount > 0;

              return (
                <Link
                  key={group.groupId}
                  href={`/groups/${group.groupId}`}
                  className="flex items-center justify-between rounded-none border border-border bg-white px-5 py-4"
                >
                  <div className="flex min-w-0 items-center gap-[18px]">
                    {group.latestExpenseDate && (
                      <DateBlock dateStr={group.latestExpenseDate} />
                    )}
                    <div className="min-w-0">
                      <p className="text-base font-bold leading-[24.75px]">
                        {group.groupName}
                      </p>
                      <p className="text-sm leading-5 text-[#404040]">
                        Group
                      </p>
                    </div>
                  </div>
                  <div className={`shrink-0 text-right ${isOwed ? "text-[#007a55]" : "text-rose-700"}`}>
                    <p className="text-sm font-medium leading-6">
                      {isOwed ? "You get" : "You owe"}
                    </p>
                    <p className="text-base font-bold leading-6">
                      {formatCurrency(Math.abs(group.amount), currency)}
                    </p>
                  </div>
                </Link>
              );
            })}

            {directExpenses.map((expense) => {
              const isOwed = expense.amount > 0;

              return (
                <div
                  key={expense.expenseId}
                  className="flex items-center justify-between rounded-none border border-border bg-white px-5 py-4"
                >
                  <div className="flex min-w-0 items-center gap-[18px]">
                    <DateBlock dateStr={expense.date} />
                    <div className="min-w-0">
                      <p className="text-base font-bold leading-[24.75px]">
                        {expense.description}
                      </p>
                      <p className="text-sm leading-5 text-[#404040]">
                        Direct
                      </p>
                    </div>
                  </div>
                  <div className={`shrink-0 text-right ${isOwed ? "text-[#007a55]" : "text-rose-700"}`}>
                    <p className="text-sm font-medium leading-6">
                      {isOwed ? "You get" : "You owe"}
                    </p>
                    <p className="text-base font-bold leading-6">
                      {formatCurrency(Math.abs(expense.amount), currency)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
