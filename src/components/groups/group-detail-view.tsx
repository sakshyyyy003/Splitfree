 "use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Coins,
  Plus,
  ReceiptText,
  UsersRound,
} from "lucide-react";

import type {
  GroupBalance,
  GroupDetail,
  GroupExpense,
  GroupMember,
  GroupSimplifiedDebt,
} from "@/types/group-detail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GroupExpenseList } from "@/components/groups/group-expense-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type GroupDetailViewProps = {
  group: GroupDetail;
  expenses: GroupExpense[];
  balances: GroupBalance[];
  simplifiedDebts: GroupSimplifiedDebt[];
  members: GroupMember[];
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const categoryLabels: Record<string, string> = {
  trip: "Trip",
  home: "Home",
  couple: "Couple",
  other: "Other",
  food: "Food",
  transport: "Transport",
  accommodation: "Accommodation",
  entertainment: "Entertainment",
  utilities: "Utilities",
  shopping: "Shopping",
};

export function GroupDetailView({
  group,
  expenses,
  balances,
  simplifiedDebts,
  members,
}: GroupDetailViewProps) {
  const sortedBalances = [...balances].sort((left, right) => {
    const magnitudeDifference =
      Math.abs(right.netBalance) - Math.abs(left.netBalance);

    if (magnitudeDifference !== 0) {
      return magnitudeDifference;
    }

    return right.netBalance - left.netBalance;
  });

  const maxBalanceMagnitude = Math.max(
    ...sortedBalances.map((balance) => Math.abs(balance.netBalance)),
    1,
  );
  const totalOwedBack = sortedBalances.reduce((sum, balance) => {
    return balance.netBalance > 0 ? sum + balance.netBalance : sum;
  }, 0);
  const totalDue = sortedBalances.reduce((sum, balance) => {
    return balance.netBalance < 0 ? sum + Math.abs(balance.netBalance) : sum;
  }, 0);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-border/80 bg-gradient-to-br from-white via-card to-secondary/45 px-6 py-6 shadow-soft sm:px-7 sm:py-7">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Back to dashboard
              </Link>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {categoryLabels[group.category] ?? group.category}
                </Badge>
                {group.isPinned ? <Badge variant="outline">Pinned</Badge> : null}
                <Badge variant="outline">{formatUpdatedAt(group.updatedAt)}</Badge>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {group.name}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                  {group.description}
                </p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-border/70 bg-background/85 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Your position
              </p>
              <p className={`mt-2 text-2xl font-bold ${getBalanceTone(group.netBalance)}`}>
                {getNetBalanceCopy(group.netBalance, group.currency)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard
              icon={ReceiptText}
              label="Expenses"
              value={`${group.expenseCount} logged`}
              helper="Running total in this group"
            />
            <MetricCard
              icon={Coins}
              label="Total spend"
              value={formatCurrency(group.totalSpent, group.currency)}
              helper="Across all tracked expenses"
            />
            <MetricCard
              icon={ArrowUpRight}
              label="Settled"
              value={formatCurrency(group.settledAmount, group.currency)}
              helper="Already recorded as paid back"
            />
            <MetricCard
              icon={UsersRound}
              label="Members"
              value={`${members.length} active`}
              helper={`Created ${dateFormatter.format(new Date(group.createdAt))}`}
            />
          </div>
        </div>
      </section>

      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          <Card className="border-border/80 bg-gradient-to-br from-white via-card to-secondary/25">
            <CardHeader>
              <CardTitle>Expense feed</CardTitle>
              <CardDescription>
                Recent group spends with category icons and mock pagination.
              </CardDescription>
              <CardAction>
                <Link
                  href={`/groups/${group.id}/expenses/new`}
                  className={buttonVariants({ size: "sm" })}
                >
                  <Plus className="size-4" />
                  Add Expense
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              <GroupExpenseList groupId={group.id} expenses={expenses} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances">
          <Card className="border-border/80 bg-gradient-to-br from-white via-card to-secondary/25">
            <CardHeader>
              <CardTitle>Running balances</CardTitle>
              <CardDescription>
                Positive balances mean money owed back. Negative balances mean
                money still due.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 md:grid-cols-3">
                <BalanceSummaryCard
                  label="Money owed back"
                  value={formatCurrency(totalOwedBack, group.currency)}
                  helper={`${sortedBalances.filter((balance) => balance.netBalance > 0).length} members in credit`}
                  tone="positive"
                />
                <BalanceSummaryCard
                  label="Money still due"
                  value={formatCurrency(totalDue, group.currency)}
                  helper={`${sortedBalances.filter((balance) => balance.netBalance < 0).length} members need to settle`}
                  tone="negative"
                />
                <BalanceSummaryCard
                  label="Suggested settlements"
                  value={`${simplifiedDebts.length}`}
                  helper={
                    simplifiedDebts.length === 1
                      ? "Only one transfer needed"
                      : "Greedy simplified debt preview"
                  }
                  tone="neutral"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  <span>Member balances</span>
                  <span>Scaled to the largest net position</span>
                </div>

                {sortedBalances.map((balance) => (
                  <div
                    key={balance.userId}
                    className="rounded-[1.5rem] border border-border/70 bg-background/85 p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          {balance.avatarUrl ? (
                            <AvatarImage src={balance.avatarUrl} alt={balance.name} />
                          ) : null}
                          <AvatarFallback>{getInitials(balance.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{balance.name}</p>
                            <Badge
                              variant={
                                balance.role === "admin" ? "default" : "outline"
                              }
                            >
                              {balance.role === "admin" ? "Admin" : "Member"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {balance.email}
                          </p>
                        </div>
                      </div>

                      <div className="text-left md:text-right">
                        <p className={`font-bold ${getBalanceTone(balance.netBalance)}`}>
                          {getMemberBalanceCopy(balance.netBalance, group.currency)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Net position
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-xs font-medium text-muted-foreground">
                        <span>Owes</span>
                        <span>Owed back</span>
                      </div>
                      <div className="flex h-3 overflow-hidden rounded-full bg-secondary/80">
                        <div className="flex-1 px-0.5 py-0.5">
                          <div className="flex h-full justify-end">
                            <div
                              className="h-full rounded-full bg-rose-500/90"
                              style={{
                                width: `${getBalanceBarWidth(
                                  balance.netBalance,
                                  maxBalanceMagnitude,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex-1 px-0.5 py-0.5">
                          <div
                            className="h-full rounded-full bg-emerald-600/90"
                            style={{
                              width: `${getPositiveBalanceBarWidth(
                                balance.netBalance,
                                maxBalanceMagnitude,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-bold">Simplified settlements</h3>
                  <p className="text-sm text-muted-foreground">
                    Minimized transfers based on the current net balances.
                  </p>
                </div>

                {simplifiedDebts.length > 0 ? (
                  <div className="grid gap-3">
                    {simplifiedDebts.map((debt) => (
                      <div
                        key={`${debt.fromUserId}-${debt.toUserId}`}
                        className="flex flex-col gap-2 rounded-[1.5rem] border border-border/70 bg-secondary/35 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <p className="font-semibold text-foreground">
                          {debt.fromName} owes {debt.toName}{" "}
                          {formatCurrency(debt.amount, group.currency)}
                        </p>
                        <Badge variant="secondary">Suggested transfer</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-border/80 bg-background/70 p-5 text-sm text-muted-foreground">
                    Everyone is settled up. No transfers are needed right now.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card className="border-border/80 bg-gradient-to-br from-white via-card to-secondary/25">
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                Everyone currently in the group and when they joined.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 rounded-[1.5rem] border border-border/70 bg-background/85 p-4"
                >
                  <Avatar>
                    {member.avatarUrl ? (
                      <AvatarImage src={member.avatarUrl} alt={member.name} />
                    ) : null}
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">{member.name}</p>
                      <Badge variant={member.role === "admin" ? "default" : "outline"}>
                        {member.role === "admin" ? "Admin" : "Member"}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {member.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Joined {dateFormatter.format(new Date(member.joinedAt))}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

type MetricCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  helper: string;
};

function MetricCard({ icon: Icon, label, value, helper }: MetricCardProps) {
  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-background/80 p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="size-3.5" />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-lg font-bold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
    </div>
  );
}

type BalanceSummaryCardProps = {
  label: string;
  value: string;
  helper: string;
  tone: "positive" | "negative" | "neutral";
};

function BalanceSummaryCard({
  label,
  value,
  helper,
  tone,
}: BalanceSummaryCardProps) {
  const toneClass =
    tone === "positive"
      ? "bg-emerald-50 text-emerald-800"
      : tone === "negative"
        ? "bg-rose-50 text-rose-800"
        : "bg-secondary/60 text-foreground";

  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-background/80 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-lg font-bold ${toneClass}`}>
        {value}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
    </div>
  );
}

function getNetBalanceCopy(amount: number, currency: string) {
  if (amount > 0) {
    return `You are owed ${formatCurrency(amount, currency)}`;
  }

  if (amount < 0) {
    return `You owe ${formatCurrency(Math.abs(amount), currency)}`;
  }

  return "All settled up";
}

function getMemberBalanceCopy(amount: number, currency: string) {
  if (amount > 0) {
    return `Gets back ${formatCurrency(amount, currency)}`;
  }

  if (amount < 0) {
    return `Owes ${formatCurrency(Math.abs(amount), currency)}`;
  }

  return "Settled up";
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

function getInitials(value: string) {
  return value
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
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

function getBalanceBarWidth(amount: number, maxBalanceMagnitude: number) {
  if (amount >= 0) {
    return 0;
  }

  return (Math.abs(amount) / maxBalanceMagnitude) * 100;
}

function getPositiveBalanceBarWidth(amount: number, maxBalanceMagnitude: number) {
  if (amount <= 0) {
    return 0;
  }

  return (amount / maxBalanceMagnitude) * 100;
}

function formatUpdatedAt(value: string) {
  return `Updated ${dateTimeFormatter.format(new Date(value))}`;
}
