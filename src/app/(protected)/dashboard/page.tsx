import Link from "next/link";

import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import {
  getMockDashboardGroups,
  getMockDashboardUser,
} from "@/lib/mock/dashboard";
import { getOverallBalances } from "@/lib/queries/balances";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [groups, overallBalances, dashboardUser, params] = await Promise.all([
    getMockDashboardGroups(),
    getOverallBalances(),
    getMockDashboardUser(),
    searchParams,
  ]);
  const activeTab = params.tab ?? "groups";
  const firstName =
    dashboardUser.name?.trim().split(/\s+/)[0] ?? dashboardUser.email ?? "there";

  const groupsHeader = (
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
  );

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Welcome back, {firstName}
      </h1>

      <DashboardTabs
        overallBalances={overallBalances}
        groups={groups}
        groupsHeader={groupsHeader}
        activeTab={activeTab}
      />
    </div>
  );
}
