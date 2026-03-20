import Link from "next/link";

import { OverallBalanceView } from "@/components/dashboard/overall-balance-view";
import { GroupList } from "@/components/groups/group-list";
import {
  getMockDashboardGroups,
  getMockDashboardUser,
} from "@/lib/mock/dashboard";
import { getOverallBalances } from "@/lib/queries/balances";

export default async function DashboardPage() {
  const [groups, overallBalances, dashboardUser] = await Promise.all([
    getMockDashboardGroups(),
    getOverallBalances(),
    getMockDashboardUser(),
  ]);
  const displayName = dashboardUser.name ?? dashboardUser.email ?? "there";

  return (
    <div className="space-y-8">
      <section className="rounded-lg border-2 border-border bg-card px-6 py-6 sm:px-7 sm:py-7">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Dashboard
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome back, {displayName}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Keep an eye on every shared tab in one place. Your groups, member
            counts, and balance snapshots update here first.
          </p>
        </div>
      </section>

      <OverallBalanceView balances={overallBalances} />

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Your groups</h2>
            <p className="text-sm text-muted-foreground">
              A quick read on where you stand across every shared circle.
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <Link
              href="/expenses/direct/new"
              className="inline-flex h-10 items-center justify-center gap-1.5 border-2 border-foreground bg-background px-4 text-sm font-bold uppercase whitespace-nowrap text-foreground transition-all outline-none select-none hover:bg-secondary active:translate-y-px"
            >
              Add Expense
            </Link>
            <Link
              href="/groups/new"
              className="inline-flex h-10 items-center justify-center gap-1.5 border border-primary bg-primary px-4 text-sm font-bold uppercase whitespace-nowrap text-primary-foreground transition-all outline-none select-none hover:bg-primary/92 active:translate-y-px"
            >
              New Group
            </Link>
          </div>
        </div>

        <GroupList groups={groups} />
      </section>
    </div>
  );
}
