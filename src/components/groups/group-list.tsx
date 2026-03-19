import { Coins, Pin, UsersRound } from "lucide-react";

import type { UserGroupSummary } from "@/lib/queries/groups";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type GroupListProps = {
  groups: UserGroupSummary[];
};

const balanceFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const categoryLabels: Record<string, string> = {
  trip: "Trip",
  home: "Home",
  couple: "Couple",
  other: "Other",
};

export function GroupList({ groups }: GroupListProps) {
  if (groups.length === 0) {
    return (
      <Card className="border-dashed bg-gradient-to-br from-card via-card to-secondary/45">
        <CardHeader className="gap-3">
          <Badge variant="outline" className="w-fit">
            Groups
          </Badge>
          <CardTitle className="text-2xl">No groups yet</CardTitle>
          <CardDescription className="max-w-2xl text-base">
            Your shared tabs, trips, and home expenses will show up here once a
            group is created and members are added.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-[1.75rem] border border-border/70 bg-background/80 p-5 text-sm text-muted-foreground">
            Group creation is the next milestone. This dashboard is ready to list
            balances as soon as your first group lands.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => {
        const balanceTone =
          group.netBalance > 0
            ? "text-emerald-700"
            : group.netBalance < 0
              ? "text-rose-700"
              : "text-muted-foreground";

        return (
          <Card
            key={group.id}
            className="border-border/80 bg-gradient-to-br from-white via-card to-secondary/35"
          >
            <CardHeader className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {categoryLabels[group.category] ?? group.category}
                    </Badge>
                    {group.isPinned ? (
                      <Badge variant="outline" className="gap-1.5">
                        <Pin className="size-3" />
                        Pinned
                      </Badge>
                    ) : null}
                  </div>
                  <CardTitle>{group.name}</CardTitle>
                </div>
              </div>
              <CardDescription className="min-h-10 text-sm leading-6">
                {group.description?.trim() ||
                  "Shared expenses, balances, and settlements in one place."}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricPill
                  icon={UsersRound}
                  label="Members"
                  value={formatMemberCount(group.memberCount)}
                />
                <MetricPill
                  icon={Coins}
                  label="Net balance"
                  value={getNetBalanceCopy(group.netBalance, group.currency)}
                  valueClassName={balanceTone}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

type MetricPillProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueClassName?: string;
};

function MetricPill({
  icon: Icon,
  label,
  value,
  valueClassName,
}: MetricPillProps) {
  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-background/80 p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="size-3.5" />
        <span>{label}</span>
      </div>
      <p className={`mt-2 text-sm font-semibold leading-6 ${valueClassName ?? ""}`}>
        {value}
      </p>
    </div>
  );
}

function formatMemberCount(count: number) {
  return `${count} ${count === 1 ? "member" : "members"}`;
}

function getNetBalanceCopy(amount: number, currency: string) {
  const formattedAmount = formatCurrency(amount, currency);

  if (amount > 0) {
    return `You are owed ${formattedAmount}`;
  }

  if (amount < 0) {
    return `You owe ${formatCurrency(Math.abs(amount), currency)}`;
  }

  return "All settled up";
}

function formatCurrency(amount: number, currency: string) {
  if (currency === "INR") {
    return balanceFormatter.format(amount);
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
