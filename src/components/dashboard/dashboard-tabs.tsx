"use client";

import { useRouter } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { CounterpartyBreakdown } from "@/components/dashboard/overall-balance-view";
import { GroupList } from "@/components/groups/group-list";
import type { DashboardOverallBalances, DashboardGroup } from "@/types/dashboard";
import type { ActivityFeedResult } from "@/types/activity";

type DashboardTabsProps = {
  overallBalances: DashboardOverallBalances;
  groups: DashboardGroup[];
  groupsHeader: React.ReactNode;
  peopleHeader: React.ReactNode;
  activityFeed: ActivityFeedResult;
  activeTab: string;
};

export function DashboardTabs({
  overallBalances,
  groups,
  groupsHeader,
  peopleHeader,
  activityFeed,
  activeTab,
}: DashboardTabsProps) {
  const { summary, counterparties } = overallBalances;
  const router = useRouter();

  const activityContent = (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Recent activity</h2>
      <ActivityFeed initial={activityFeed} />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Mobile: content driven by bottom nav tab (no visible tab bar) */}
      <div className="lg:hidden">
        {activeTab === "people" ? (
          <div className="space-y-4">
            {peopleHeader}
            <CounterpartyBreakdown
              counterparties={counterparties}
              currency={summary.currency}
            />
          </div>
        ) : activeTab === "activity" ? (
          activityContent
        ) : (
          <div className="space-y-4">
            {groupsHeader}
            <GroupList groups={groups} />
          </div>
        )}
      </div>

      {/* Desktop: tab switcher + content */}
      <div className="hidden lg:block">
        {activeTab === "activity" ? (
          activityContent
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(tab) => router.push(`/dashboard?tab=${tab}`)}
          >
            <TabsList className="w-full">
              <TabsTrigger value="groups">Groups</TabsTrigger>
              <TabsTrigger value="people">People</TabsTrigger>
            </TabsList>

            <TabsContent value="groups" className="mt-6 space-y-4">
              {groupsHeader}
              <GroupList groups={groups} />
            </TabsContent>

            <TabsContent value="people" className="mt-6 space-y-4">
              {peopleHeader}
              <CounterpartyBreakdown
                counterparties={counterparties}
                currency={summary.currency}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
