"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  CircleHelp,
  House,
  type LucideIcon,
  ReceiptText,
  ShoppingBag,
  Ticket,
  TramFront,
  UtensilsCrossed,
} from "lucide-react";

import type { GroupExpense } from "@/types/group-detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type GroupExpenseListProps = {
  groupId: string;
  expenses: GroupExpense[];
};

type ExpensePage = {
  items: GroupExpense[];
  nextCursor: string | null;
};

const PAGE_SIZE = 4;

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

const categoryIcons: Record<string, LucideIcon> = {
  food: UtensilsCrossed,
  transport: TramFront,
  accommodation: House,
  entertainment: Ticket,
  utilities: ReceiptText,
  shopping: ShoppingBag,
  default: CircleHelp,
};

export function GroupExpenseList({ groupId, expenses }: GroupExpenseListProps) {
  const orderedExpenses = [...expenses].sort((left, right) => {
    const leftTimestamp = new Date(
      left.incurredOn || left.createdAt,
    ).getTime();
    const rightTimestamp = new Date(
      right.incurredOn || right.createdAt,
    ).getTime();

    if (leftTimestamp !== rightTimestamp) {
      return rightTimestamp - leftTimestamp;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });

  const initialPage = getExpensePage(orderedExpenses, null);
  const [visibleExpenses, setVisibleExpenses] = useState(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);

  function handleLoadMore() {
    if (!nextCursor) {
      return;
    }

    const nextPage = getExpensePage(orderedExpenses, nextCursor);

    setVisibleExpenses((currentExpenses) => [
      ...currentExpenses,
      ...nextPage.items,
    ]);
    setNextCursor(nextPage.nextCursor);
  }

  if (orderedExpenses.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-background/70 px-5 py-10 text-center">
        <p className="text-sm font-semibold text-foreground">No expenses yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          This group does not have any mock expenses loaded.
        </p>
      </div>
    );
  }

  const remainingExpenseCount = orderedExpenses.length - visibleExpenses.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-border/70 bg-background/75 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Showing {visibleExpenses.length} of {orderedExpenses.length} expenses
          </p>
          <p className="text-sm text-muted-foreground">
            Cursor-based mock pagination with a {PAGE_SIZE}-item page size.
          </p>
        </div>

        {nextCursor ? (
          <Button type="button" variant="outline" size="sm" onClick={handleLoadMore}>
            Load more
          </Button>
        ) : (
          <Badge variant="secondary">All caught up</Badge>
        )}
      </div>

      {visibleExpenses.map((expense) => {
        const Icon = categoryIcons[expense.category] ?? categoryIcons.default;

        return (
          <div
            key={expense.id}
            className="rounded-[1.5rem] border border-border/70 bg-background/85 p-4"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                  <Icon className="size-5" />
                </div>

                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold">{expense.title}</p>
                    <Badge variant="outline">
                      {categoryLabels[expense.category] ?? expense.category}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Paid by {expense.paidByName} on{" "}
                    {dateFormatter.format(new Date(expense.incurredOn))}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {expense.splitSummary}
                  </p>

                  {expense.notes ? (
                    <p className="text-sm leading-6 text-foreground/80">
                      {expense.notes}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="shrink-0 rounded-2xl bg-secondary px-4 py-3 text-right">
                <p className="text-lg font-bold">
                  {formatCurrency(expense.amount, expense.currency)}
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Added {dateTimeFormatter.format(new Date(expense.createdAt))}
                </p>
                <Link
                  href={`/groups/${groupId}/expenses/${expense.id}`}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  View details
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      {remainingExpenseCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          {remainingExpenseCount} more expense
          {remainingExpenseCount === 1 ? "" : "s"} available in mock data.
        </p>
      ) : null}
    </div>
  );
}

function getExpensePage(expenses: GroupExpense[], cursor: string | null): ExpensePage {
  const startIndex = cursor ? Number.parseInt(cursor, 10) : 0;
  const safeStartIndex = Number.isNaN(startIndex) ? 0 : startIndex;
  const endIndex = safeStartIndex + PAGE_SIZE;

  return {
    items: expenses.slice(safeStartIndex, endIndex),
    nextCursor: endIndex < expenses.length ? String(endIndex) : null,
  };
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
