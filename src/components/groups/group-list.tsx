"use client";

import { useState } from "react";
import Link from "next/link";

import type { DashboardGroup, DashboardGroupCounterparty } from "@/types/dashboard";
import { Card } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

const GROUPS_PER_PAGE = 10;

type GroupListProps = {
  groups: DashboardGroup[];
};

const balanceFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const categoryEmoji: Record<string, string> = {
  trip: "✈️",
  home: "🏠",
  couple: "❤️",
  work: "💼",
  friends: "🎉",
  other: "🌀",
};

export function GroupList({ groups }: GroupListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(groups.length / GROUPS_PER_PAGE);
  const showPagination = groups.length > GROUPS_PER_PAGE;

  const paginatedGroups = showPagination
    ? groups.slice(
        (currentPage - 1) * GROUPS_PER_PAGE,
        currentPage * GROUPS_PER_PAGE,
      )
    : groups;

  if (groups.length === 0) {
    return (
      <Card className="border-dashed bg-card p-6">
        <p className="text-lg font-bold">No groups yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first group to start tracking shared expenses.
        </p>
        <Link
          href="/groups/new"
          className="mt-4 inline-flex h-10 items-center justify-center border border-primary bg-primary px-4 text-sm font-bold uppercase text-primary-foreground transition-all hover:bg-primary/92 active:translate-y-px"
        >
          Create your first group
        </Link>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {paginatedGroups.map((group) => {
        const emoji = categoryEmoji[group.category] ?? "📋";

        const activeCounterparties = group.counterparties.filter(
          (c) => c.amount !== 0,
        );
        const hasTree = group.netBalance !== 0 && activeCounterparties.length > 0;

        return (
          <Link key={group.id} href={`/groups/${group.id}`} className="block">
            <Card className="overflow-clip bg-white px-6 py-5">
              <div className="flex flex-row items-center">
                <div className="flex flex-1 items-center gap-[18px]">
                  <span className="text-[22px] leading-4">{emoji}</span>
                  <p className="text-lg font-bold leading-[24.75px]">
                    {group.name}
                  </p>
                </div>
                {group.netBalance === 0 ? (
                  <p className="shrink-0 text-sm font-medium text-muted-foreground">
                    Settled up
                  </p>
                ) : (
                  <div className={`shrink-0 text-right ${group.netBalance > 0 ? "text-[#007a55]" : "text-rose-700"}`}>
                    <p className="text-sm font-medium leading-6">
                      {group.netBalance > 0 ? "You get" : "You owe"}
                    </p>
                    <p className="text-base font-bold leading-6">
                      {formatCurrency(Math.abs(group.netBalance), group.currency)}
                    </p>
                  </div>
                )}
              </div>
              {hasTree && (
                <CounterpartyTree
                  counterparties={activeCounterparties}
                  currency={group.currency}
                />
              )}
            </Card>
          </Link>
        );
      })}

      {showPagination && (
        <GroupPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}


function formatCurrency(amount: number, currency: string) {
  if (currency === "INR") return balanceFormatter.format(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function GroupPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  function getPageNumbers() {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    if (currentPage > 3) pages.push("ellipsis");

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (currentPage < totalPages - 2) pages.push("ellipsis");

    pages.push(totalPages);
    return pages;
  }

  return (
    <Pagination className="pt-2">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            aria-disabled={currentPage === 1}
          />
        </PaginationItem>

        {getPageNumbers().map((page, i) =>
          page === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink
                isActive={page === currentPage}
                onClick={() => onPageChange(page)}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            aria-disabled={currentPage === totalPages}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function CounterpartyTree({
  counterparties,
  currency,
}: {
  counterparties: DashboardGroupCounterparty[];
  currency: string;
}) {
  return (
    <div className="relative ml-[29px] mt-2 border-l border-border pl-[18px]">
      {counterparties.map((c, index) => {
        const isLast = index === counterparties.length - 1;
        const isOwed = c.amount > 0;

        return (
          <div
            key={c.userId}
            className={`relative py-[3px] before:absolute before:left-[-18px] before:top-1/2 before:h-px before:w-[18px] before:bg-border ${isLast ? "after:absolute after:left-[-19px] after:top-1/2 after:bottom-[-1px] after:w-[2px] after:bg-white" : ""}`}
          >
            <p
              className={`text-[13px] leading-5 ${isOwed ? "text-[#007a55]" : "text-rose-700"}`}
            >
              {isOwed
                ? `${c.name} owes you ${formatCurrency(c.amount, currency)}`
                : `You owe ${c.name} ${formatCurrency(Math.abs(c.amount), currency)}`}
            </p>
          </div>
        );
      })}
    </div>
  );
}
