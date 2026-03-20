"use client";

import { useRouter } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MobileBalanceBanner,
  CounterpartyBreakdown,
} from "@/components/dashboard/overall-balance-view";
import { GroupList } from "@/components/groups/group-list";
import type { DashboardOverallBalances, DashboardGroup } from "@/types/dashboard";

type DashboardTabsProps = {
  overallBalances: DashboardOverallBalances;
  groups: DashboardGroup[];
  groupsHeader: React.ReactNode;
  activeTab: string;
};

export function DashboardTabs({
  overallBalances,
  groups,
  groupsHeader,
  activeTab,
}: DashboardTabsProps) {
  const { summary, counterparties } = overallBalances;
  const router = useRouter();

  return (
    <div className="space-y-4">
      {/* Balance banner — shown on all viewports */}
      <MobileBalanceBanner summary={summary} />

      {/* Mobile: content driven by bottom nav tab (no visible tab bar) */}
      <div className="lg:hidden">
        {activeTab === "people" ? (
          <CounterpartyBreakdown
            counterparties={counterparties}
            currency={summary.currency}
          />
        ) : (
          <div className="space-y-4">
            {groupsHeader}
            <GroupList groups={groups} />
          </div>
        )}
      </div>

      {/* Desktop: tab switcher + content */}
      <div className="hidden lg:block">
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

          <TabsContent value="people" className="mt-6">
            <CounterpartyBreakdown
              counterparties={counterparties}
              currency={summary.currency}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
