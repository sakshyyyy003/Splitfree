import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  PencilLine,
  ReceiptText,
  UsersRound,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteExpenseButton } from "@/components/groups/delete-expense-button";
import type { GroupDetail, GroupExpenseDetail } from "@/types/group-detail";

type ExpenseDetailViewProps = {
  group: GroupDetail;
  expense: GroupExpenseDetail;
  canDelete: boolean;
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
  year: "numeric",
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

const splitTypeLabels: Record<GroupExpenseDetail["splitType"], string> = {
  equal: "Equal split",
  exact: "Exact amounts",
  percentage: "Percentage split",
  shares: "Shares split",
};

export function ExpenseDetailView({
  group,
  expense,
  canDelete,
}: ExpenseDetailViewProps) {
  const payerContribution = expense.participants.find(
    (participant) => participant.userId === expense.paidByUserId,
  );
  const participantCount = expense.participants.length;

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-border/80 bg-gradient-to-br from-white via-card to-secondary/45 px-6 py-6 shadow-soft sm:px-7 sm:py-7">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <Link
                href={`/groups/${group.id}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Back to {group.name}
              </Link>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {categoryLabels[expense.category] ?? expense.category}
                </Badge>
                <Badge variant="outline">
                  {splitTypeLabels[expense.splitType] ?? expense.splitType}
                </Badge>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {expense.title}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Paid by {expense.paidByName} on{" "}
                  {dateFormatter.format(new Date(expense.incurredOn))} in{" "}
                  {group.name}.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/groups/${group.id}/expenses/${expense.id}/edit`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-background px-5 text-sm font-bold shadow-subtle transition-colors hover:bg-secondary"
              >
                <PencilLine className="size-4" />
                Edit expense
              </Link>
              <DeleteExpenseButton
                expenseId={expense.id}
                groupId={group.id}
                canDelete={canDelete}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard
              icon={CircleDollarSign}
              label="Amount"
              value={formatCurrency(expense.amount, expense.currency)}
              helper={expense.splitSummary}
            />
            <MetricCard
              icon={UsersRound}
              label="Participants"
              value={`${participantCount} involved`}
              helper={payerContribution ? `${expense.paidByName} fronted the full bill` : "Shared expense"}
            />
            <MetricCard
              icon={CalendarDays}
              label="Incurred on"
              value={dateFormatter.format(new Date(expense.incurredOn))}
              helper={`Added ${dateTimeFormatter.format(new Date(expense.createdAt))}`}
            />
            <MetricCard
              icon={ReceiptText}
              label="Category"
              value={categoryLabels[expense.category] ?? expense.category}
              helper={group.name}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <Card className="border-border/80 bg-gradient-to-br from-white via-card to-secondary/25">
          <CardHeader>
            <CardTitle>Split breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {expense.participants.map((participant) => {
              const netAmount = participant.paidAmount - participant.owedAmount;

              return (
                <div
                  key={participant.userId}
                  className="rounded-[1.5rem] border border-border/70 bg-background/85 p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar>
                        {participant.avatarUrl ? (
                          <AvatarImage
                            src={participant.avatarUrl}
                            alt={participant.name}
                          />
                        ) : null}
                        <AvatarFallback>
                          {getInitials(participant.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">
                            {participant.name}
                          </p>
                          {participant.userId === expense.paidByUserId ? (
                            <Badge variant="secondary">Payer</Badge>
                          ) : null}
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          {participant.email}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 text-sm sm:grid-cols-3 sm:text-right">
                      <SplitAmount
                        label="Paid"
                        value={formatCurrency(participant.paidAmount, expense.currency)}
                      />
                      <SplitAmount
                        label="Share"
                        value={formatCurrency(participant.owedAmount, expense.currency)}
                      />
                      <SplitAmount
                        label="Net"
                        value={getNetParticipantCopy(netAmount, expense.currency)}
                        tone={getNetTone(netAmount)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/80 bg-gradient-to-br from-white via-card to-secondary/25">
            <CardHeader>
              <CardTitle>Expense notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                {expense.notes ?? "No notes were added for this expense."}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-gradient-to-br from-white via-card to-secondary/25">
            <CardHeader>
              <CardTitle>Next step</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-6 text-muted-foreground">
                Editing is the next flow in the roadmap. This link already
                points to the future route so the navigation shape stays
                stable.
              </p>
              <Link
                href={`/groups/${group.id}/expenses/${expense.id}/edit`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
              >
                Open edit route
                <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

type MetricCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  helper: string;
};

type SplitAmountProps = {
  label: string;
  value: string;
  tone?: string;
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

function SplitAmount({ label, value, tone }: SplitAmountProps) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-semibold ${tone ?? ""}`}>{value}</p>
    </div>
  );
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

function getNetParticipantCopy(amount: number, currency: string) {
  if (amount > 0) {
    return `Gets back ${formatCurrency(amount, currency)}`;
  }

  if (amount < 0) {
    return `Owes ${formatCurrency(Math.abs(amount), currency)}`;
  }

  return "Settled";
}

function getNetTone(amount: number) {
  if (amount > 0) {
    return "text-primary";
  }

  if (amount < 0) {
    return "text-amber-700";
  }

  return "text-foreground";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
