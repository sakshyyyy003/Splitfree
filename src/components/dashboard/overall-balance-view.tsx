import Link from "next/link";
import { ArrowRight, ArrowUpRight, HandCoins, ReceiptIndianRupee } from "lucide-react";

import type {
  CounterpartyBreakdownEntry,
  DashboardCounterpartyBalance,
  DashboardOverallBalances,
  DashboardOverallBalanceSummary,
} from "@/types/dashboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type OverallBalanceViewProps = {
  balances: DashboardOverallBalances;
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function MobileBalanceBanner({
  summary,
}: {
  summary: DashboardOverallBalanceSummary;
}) {
  const { netBalance, totalOwed, totalYouOwe, currency } = summary;

  let label: string;
  let amount: string;
  let tone: string;

  if (netBalance > 0) {
    label = "Overall, you get";
    amount = formatCurrency(netBalance, currency);
    tone = "text-[#007a55]";
  } else if (netBalance < 0) {
    label = "Overall, you owe";
    amount = formatCurrency(Math.abs(netBalance), currency);
    tone = "text-rose-700";
  } else {
    label = "All settled up";
    amount = "";
    tone = "text-foreground";
  }

  return (
    <div className="flex items-end gap-2 pt-1">
      <span className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {amount ? (
        <span className={`text-2xl font-bold leading-8 ${tone}`}>{amount}</span>
      ) : null}
    </div>
  );
}

export function BalanceSummary({
  summary,
}: {
  summary: DashboardOverallBalanceSummary;
}) {
  return (
    <Card className="border-2 border-border bg-card">
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="secondary" className="w-fit">
            Snapshot
          </Badge>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {formatUpdatedAt(summary.updatedAt)}
          </p>
        </div>
        <CardTitle className="text-2xl">Where you stand overall</CardTitle>
        <CardDescription className="text-base leading-6">
          Positive balances are incoming. Negative balances need settlement.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <SummaryPill
          icon={ReceiptIndianRupee}
          label="You are owed"
          value={formatCurrency(summary.totalOwed, summary.currency)}
          toneClassName="text-emerald-700"
        />
        <SummaryPill
          icon={HandCoins}
          label="You owe"
          value={formatCurrency(summary.totalYouOwe, summary.currency)}
          toneClassName="text-rose-700"
        />
        <SummaryPill
          icon={ArrowUpRight}
          label="Net position"
          value={getNetPositionCopy(summary.netBalance, summary.currency)}
          toneClassName={getBalanceTone(summary.netBalance)}
        />
      </CardContent>
    </Card>
  );
}

export function CounterpartyBreakdown({
  counterparties,
  currency,
}: {
  counterparties: DashboardCounterpartyBalance[];
  currency: string;
}) {
  if (counterparties.length === 0) {
    return (
      <Card className="border-dashed bg-card p-6">
        <p className="text-lg font-bold">No balances yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          New counterparties will show up here as soon as shared expenses land.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {counterparties.map((counterparty) => {
        const activeBreakdowns = counterparty.breakdowns.filter(
          (b) => b.amount !== 0,
        );

        return (
          <Card
            key={counterparty.userId}
            className="relative overflow-clip bg-white px-6 py-5"
          >
            <Link
              href={`/people/${counterparty.userId}`}
              className="absolute inset-0 z-0"
              aria-label={`View balance with ${counterparty.name}`}
            />
            <div className="relative z-10 flex flex-row items-center">
              <div className="flex flex-1 items-center gap-[18px]">
                <Avatar>
                  {counterparty.avatarUrl ? (
                    <AvatarImage
                      src={counterparty.avatarUrl}
                      alt={counterparty.name}
                    />
                  ) : null}
                  <AvatarFallback>
                    {getInitials(counterparty.name)}
                  </AvatarFallback>
                </Avatar>
                <p className="text-lg font-bold leading-[24.75px]">
                  {counterparty.name}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right">
                  {counterparty.netBalance === 0 ? (
                    <p className="text-sm font-medium text-muted-foreground">
                      Settled up
                    </p>
                  ) : (
                    <div className={`${counterparty.netBalance > 0 ? "text-[#007a55]" : "text-rose-700"}`}>
                      <p className="text-sm font-medium leading-6">
                        {counterparty.netBalance > 0 ? "You get" : "You owe"}
                      </p>
                      <p className="text-base font-bold leading-6">
                        {formatCurrency(Math.abs(counterparty.netBalance), currency)}
                      </p>
                    </div>
                  )}
                </div>
                {counterparty.netBalance !== 0 && (
                  <Link
                    href={`/expenses/direct/settle?with=${counterparty.userId}`}
                    className="relative z-20 inline-flex h-8 items-center justify-center gap-1.5 border border-primary bg-primary px-3 text-xs font-bold uppercase whitespace-nowrap text-primary-foreground transition-all outline-none select-none hover:bg-primary/92 active:translate-y-px"
                  >
                    Settle Up
                  </Link>
                )}
              </div>
            </div>
            {activeBreakdowns.length > 0 && (
              <div className="relative z-10">
                <PersonBreakdownTree
                  name={counterparty.name}
                  breakdowns={activeBreakdowns}
                  currency={currency}
                />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export function OverallBalanceView({ balances }: OverallBalanceViewProps) {
  const { summary, counterparties } = balances;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Overall balances</h2>
        <p className="text-sm text-muted-foreground">
          Totals across all shared groups, with the fastest path into the group you
          would use to settle each balance.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.4fr]">
        <BalanceSummary summary={summary} />
        <CounterpartyBreakdown
          counterparties={counterparties}
          currency={summary.currency}
        />
      </div>
    </section>
  );
}

type SummaryPillProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  toneClassName: string;
};

function SummaryPill({
  icon: Icon,
  label,
  value,
  toneClassName,
}: SummaryPillProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="size-3.5" />
        <span>{label}</span>
      </div>
      <p className={`mt-2 text-lg font-bold ${toneClassName}`}>{value}</p>
    </div>
  );
}

function PersonBreakdownTree({
  name,
  breakdowns,
  currency,
}: {
  name: string;
  breakdowns: CounterpartyBreakdownEntry[];
  currency: string;
}) {
  return (
    <div className="relative ml-[29px] mt-2 border-l border-border pl-[18px]">
      {breakdowns.map((b, index) => {
        const isLast = index === breakdowns.length - 1;
        const isOwed = b.amount > 0;
        const isDirect = b.groupId === null;

        let label: string;
        if (isDirect) {
          label = isOwed
            ? `${name} owes you ${formatCurrency(Math.abs(b.amount), currency)} as direct expense`
            : `You owe ${name} ${formatCurrency(Math.abs(b.amount), currency)} as direct expense`;
        } else {
          label = isOwed
            ? `${name} owes you ${formatCurrency(b.amount, currency)} (${b.groupName})`
            : `You owe ${name} ${formatCurrency(Math.abs(b.amount), currency)} (${b.groupName})`;
        }

        return (
          <div
            key={b.groupId ?? "direct"}
            className={`relative py-[3px] before:absolute before:left-[-18px] before:top-1/2 before:h-px before:w-[18px] before:bg-border ${isLast ? "after:absolute after:left-[-19px] after:top-1/2 after:bottom-[-1px] after:w-[2px] after:bg-white" : ""}`}
          >
            <p
              className={`text-[13px] leading-5 ${isOwed ? "text-[#007a55]" : "text-rose-700"}`}
            >
              {label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function getNetPositionCopy(amount: number, currency: string) {
  if (amount > 0) {
    return `Net +${formatCurrency(amount, currency)}`;
  }

  if (amount < 0) {
    return `Net -${formatCurrency(Math.abs(amount), currency)}`;
  }

  return "Perfectly settled";
}

function getBalanceHeadline(amount: number, currency: string) {
  if (amount > 0) {
    return `${formatCurrency(amount, currency)} owed back`;
  }

  if (amount < 0) {
    return `${formatCurrency(Math.abs(amount), currency)} to pay`;
  }

  return "All settled up";
}

function formatCounterpartyDirection(amount: number, currency: string) {
  if (amount > 0) {
    return `owes you ${formatCurrency(amount, currency)}`;
  }

  if (amount < 0) {
    return `you owe ${formatCurrency(Math.abs(amount), currency)}`;
  }

  return "settled";
}

function formatCurrency(amount: number, currency: string) {
  if (currency === "INR") {
    return currencyFormatter.format(amount);
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getBalanceTone(amount: number) {
  if (amount > 0) {
    return "text-emerald-700";
  }

  if (amount < 0) {
    return "text-rose-700";
  }

  return "text-foreground";
}

function getInitials(value: string) {
  return value
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatUpdatedAt(value: string) {
  return `Updated ${dateTimeFormatter.format(new Date(value))}`;
}
