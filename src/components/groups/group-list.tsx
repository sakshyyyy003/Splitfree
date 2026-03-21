import Link from "next/link";

import type { DashboardGroup } from "@/types/dashboard";
import { Card } from "@/components/ui/card";

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
  couple: "💑",
  other: "📋",
};

export function GroupList({ groups }: GroupListProps) {
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
      {groups.map((group) => {
        const emoji = categoryEmoji[group.category] ?? "📋";

        return (
          <Link key={group.id} href={`/groups/${group.id}`} className="block">
            <Card className="flex flex-row items-center overflow-clip bg-white px-6 py-5">
              <div className="flex flex-1 items-center gap-[18px]">
                <span className="text-[22px] leading-4">{emoji}</span>
                <div className="flex flex-col">
                  <p className="text-lg font-bold leading-[24.75px]">
                    {group.name}
                  </p>
                  <p className="text-sm font-medium leading-6 text-[#7e7e7e]">
                    {group.memberCount}{" "}
                    {group.memberCount === 1 ? "member" : "members"}
                  </p>
                </div>
              </div>
              <p
                className={`shrink-0 text-base font-bold leading-6 ${getBalanceTone(group.netBalance)}`}
              >
                {getBalanceCopy(group.netBalance, group.currency)}
              </p>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function getBalanceCopy(amount: number, currency: string) {
  if (amount > 0) return `You get ${formatCurrency(amount, currency)}`;
  if (amount < 0) return `You owe ${formatCurrency(Math.abs(amount), currency)}`;
  return "Settled up";
}

function getBalanceTone(amount: number) {
  if (amount > 0) return "text-[#007a55]";
  if (amount < 0) return "text-rose-700";
  return "text-muted-foreground";
}

function formatCurrency(amount: number, currency: string) {
  if (currency === "INR") return balanceFormatter.format(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
