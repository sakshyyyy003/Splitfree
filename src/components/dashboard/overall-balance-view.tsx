import Link from "next/link";
import { ArrowRight, ArrowUpRight, HandCoins, ReceiptIndianRupee } from "lucide-react";

import type {
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
    amount = formatCurrency(totalOwed, currency);
    tone = "text-[#007a55]";
  } else if (netBalance < 0) {
    label = "Overall, you owe";
    amount = formatCurrency(totalYouOwe, currency);
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
  return (
    <Card className="border-2 border-border bg-card">
      <CardHeader>
        <CardTitle>Per-person breakdown</CardTitle>
        <CardDescription>
          Focus on the biggest swings first and jump into the group that matters
          most for each balance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {counterparties.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
            Everyone is settled. New counterparties will show up here as soon as
            shared expenses land.
          </div>
        ) : (
          counterparties.map((counterparty) => (
            <div
              key={counterparty.userId}
              className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
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

                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{counterparty.name}</p>
                    <Badge variant="outline">
                      {formatCounterpartyDirection(
                        counterparty.netBalance,
                        currency
                      )}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {counterparty.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Shared across {counterparty.groupLabel}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Last activity{" "}
                    {dateTimeFormatter.format(
                      new Date(counterparty.lastActivityAt)
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 sm:items-end">
                <p
                  className={`text-lg font-bold ${getBalanceTone(counterparty.netBalance)}`}
                >
                  {getBalanceHeadline(counterparty.netBalance, currency)}
                </p>
                <Button
                  render={
                    <Link href={`/groups/${counterparty.settleGroupId}`} />
                  }
                  size="sm"
                  variant="outline"
                >
                  Settle via {counterparty.settleGroupName}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
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
