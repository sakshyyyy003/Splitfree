"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CircleHelp,
  Handshake,
  House,
  type LucideIcon,
  ReceiptText,
  ShoppingBag,
  Ticket,
  TramFront,
  UtensilsCrossed,
} from "lucide-react";

import type { GroupExpense, GroupSettlement } from "@/types/group-detail";
import { Card } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type GroupExpenseListProps = {
  groupId: string;
  expenses: GroupExpense[];
  settlements: GroupSettlement[];
  currentUserId: string;
  isUserSettled: boolean;
};

type FeedItem =
  | { type: "expense"; data: GroupExpense; date: Date }
  | { type: "settlement"; data: GroupSettlement; date: Date };

const PAGE_SIZE = 10;

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

const categoryIcons: Record<string, LucideIcon> = {
  food: UtensilsCrossed,
  transport: TramFront,
  accommodation: House,
  entertainment: Ticket,
  utilities: ReceiptText,
  shopping: ShoppingBag,
  default: CircleHelp,
};

export function GroupExpenseList({ groupId, expenses, settlements, currentUserId, isUserSettled }: GroupExpenseListProps) {
  // Merge expenses and settlements into a unified feed sorted by date descending
  const feed: FeedItem[] = [
    ...expenses.map((e) => ({
      type: "expense" as const,
      data: e,
      date: new Date(e.incurredOn || e.createdAt),
    })),
    ...settlements.map((s) => ({
      type: "settlement" as const,
      data: s,
      date: new Date(s.createdAt),
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(feed.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = feed.slice(startIndex, startIndex + PAGE_SIZE);

  if (feed.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card px-5 py-10 text-center">
        <p className="text-sm font-semibold text-foreground">No expenses yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          This group does not have any mock expenses loaded.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-[12px]">
        {pageItems.map((item) => {
          if (item.type === "settlement") {
            return (
              <SettlementCard
                key={`s-${item.data.id}`}
                settlement={item.data}
                groupId={groupId}
                currentUserId={currentUserId}
                date={item.date}
              />
            );
          }

          const expense = item.data;
          const Icon = categoryIcons[expense.category] ?? categoryIcons.default;
          const incurredDate = item.date;

          return (
            <Link key={expense.id} href={`/groups/${groupId}/expenses/${expense.id}`}>
              <Card className="rounded-none px-5 py-4 transition-all hover:border-foreground/25 hover:shadow-sm active:translate-y-px">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-[18px]">
                    <div className="shrink-0 text-[12px] font-medium uppercase leading-4 tracking-[2.16px] text-[#404040]/70">
                      <p>{monthFormatter.format(incurredDate)}</p>
                      <p>{dayFormatter.format(incurredDate)}</p>
                    </div>

                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[3px] bg-[#f5f5f0]">
                      <Icon className="size-5" />
                    </div>

                    <div className="min-w-0 pb-0.5">
                      <p className="text-base font-bold leading-[24.75px] text-black">
                        {expense.title}
                      </p>
                      <p className="truncate text-sm leading-5 text-[#404040]">
                        {expense.isSelfExpense
                          ? "You paid yourself"
                          : `${expense.paidByUserId === currentUserId ? "You" : expense.paidByName} paid ${formatCurrency(expense.amount, expense.currency)}`}
                      </p>
                    </div>
                  </div>

                  {isUserSettled ? (
                    <p className="shrink-0 text-sm font-medium text-muted-foreground">
                      Settled up
                    </p>
                  ) : expense.isSelfExpense ? (
                    <p className="shrink-0 text-sm font-medium text-muted-foreground">
                      No balance
                    </p>
                  ) : expense.currentUserBalance !== 0 ? (
                    <div className={`shrink-0 text-right ${expense.currentUserBalance > 0 ? "text-[#007a55]" : "text-rose-700"}`}>
                      <p className="text-sm font-medium leading-6">
                        {expense.currentUserBalance > 0 ? "You get" : "You owe"}
                      </p>
                      <p className="text-base font-bold leading-6">
                        {formatCurrency(Math.abs(expense.currentUserBalance), expense.currency)}
                      </p>
                    </div>
                  ) : (
                    <p className="shrink-0 text-sm font-medium text-muted-foreground">
                      Not involved
                    </p>
                  )}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage((p) => Math.max(1, p - 1));
                }}
                aria-disabled={currentPage === 1}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>

            {getPageNumbers(currentPage, totalPages).map((page, index) =>
              page === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    isActive={page === currentPage}
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(page);
                    }}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                }}
                aria-disabled={currentPage === totalPages}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

function SettlementCard({
  settlement,
  groupId,
  currentUserId,
  date,
}: {
  settlement: GroupSettlement;
  groupId: string;
  currentUserId: string;
  date: Date;
}) {
  const payerName =
    settlement.paidByUserId === currentUserId ? "You" : settlement.paidByName;
  const payeeName =
    settlement.paidToUserId === currentUserId ? "you" : settlement.paidToName;

  return (
    <Link href={`/groups/${groupId}/settlements/${settlement.id}`}>
      <Card className="rounded-none border-emerald-200 bg-emerald-50/50 px-5 py-4 transition-all hover:border-emerald-300 hover:shadow-sm active:translate-y-px">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-[18px]">
            <div className="shrink-0 text-[12px] font-medium uppercase leading-4 tracking-[2.16px] text-[#404040]/70">
              <p>{monthFormatter.format(date)}</p>
              <p>{dayFormatter.format(date)}</p>
            </div>

            <div className="flex size-10 shrink-0 items-center justify-center rounded-[3px] bg-emerald-100">
              <Handshake className="size-5 text-emerald-700" />
            </div>

            <div className="min-w-0 pb-0.5">
              <p className="text-base font-bold leading-[24.75px] text-black">
                Settlement
              </p>
              <p className="truncate text-sm leading-5 text-[#404040]">
                {payerName} paid {payeeName}
              </p>
            </div>
          </div>

          <p className="shrink-0 text-base font-bold leading-6 text-emerald-700">
            {formatCurrency(settlement.amount, "INR")}
          </p>
        </div>
      </Card>
    </Link>
  );
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  pages.push(total);
  return pages;
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
