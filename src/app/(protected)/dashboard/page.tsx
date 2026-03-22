import Link from "next/link";

import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { MobileBalanceBanner } from "@/components/dashboard/overall-balance-view";
import { getActivityFeed } from "@/lib/queries/activity";
import { getOverallBalances } from "@/lib/queries/balances";
import { getDashboardGroups } from "@/lib/queries/group";
import { getDashboardUser } from "@/lib/queries/profile";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [groups, overallBalances, activityFeed, dashboardUser, params] =
    await Promise.all([
      getDashboardGroups(),
      getOverallBalances(),
      getActivityFeed(),
      getDashboardUser(),
      searchParams,
    ]);
  const activeTab = params.tab ?? "groups";
  const displayName = dashboardUser.name ?? dashboardUser.email ?? "there";

  const groupsHeader = (
    <div className="flex items-center justify-between gap-3 sm:items-end">
      <h2 className="text-lg font-bold tracking-tight sm:text-2xl">Your groups</h2>

      <div className="flex shrink-0 gap-2">
        <Link
          href="/expenses/direct/new"
          className="hidden sm:inline-flex h-10 items-center justify-center gap-1.5 border-2 border-foreground bg-background px-4 text-sm font-bold uppercase whitespace-nowrap text-foreground transition-all outline-none select-none hover:bg-secondary active:translate-y-px"
        >
          Add Expense
        </Link>
        <Link
          href="/groups/new"
          className="inline-flex h-8 items-center justify-center gap-1.5 border border-primary bg-primary px-3 text-xs font-bold uppercase whitespace-nowrap text-primary-foreground transition-all outline-none select-none hover:bg-primary/92 active:translate-y-px sm:h-10 sm:px-4 sm:text-sm"
        >
          New Group
        </Link>
      </div>
    </div>
  );

  const peopleHeader = (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-2xl font-bold tracking-tight">People</h2>
      <Link
        href="/expenses/direct/new"
        className="inline-flex h-10 items-center justify-center gap-1.5 border-2 border-foreground bg-background px-4 text-sm font-bold uppercase whitespace-nowrap text-foreground transition-all outline-none select-none hover:bg-secondary active:translate-y-px"
      >
        Add Expense
      </Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-[800px] space-y-4">
      {activeTab !== "activity" && (
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[30px] font-bold leading-10 tracking-[-0.9px]">
            Welcome back, {displayName}
          </h1>
          <MobileBalanceBanner summary={overallBalances.summary} />
        </div>
      )}
      <DashboardTabs
        overallBalances={overallBalances}
        groups={groups}
        groupsHeader={groupsHeader}
        peopleHeader={peopleHeader}
        activityFeed={activityFeed}
        activeTab={activeTab}
      />
    </div>
  );
}
