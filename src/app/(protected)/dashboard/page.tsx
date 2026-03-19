import dashboardGroups from "../../../../mockdata/dashboard-groups.json";
import dashboardUser from "../../../../mockdata/dashboard-user.json";

import { GroupList } from "@/components/groups/group-list";
import type { DashboardGroup } from "@/types/dashboard";

export default async function DashboardPage() {
  const groups = dashboardGroups as DashboardGroup[];
  const displayName = dashboardUser.name ?? dashboardUser.email ?? "there";

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-border/80 bg-gradient-to-br from-white via-card to-secondary/45 px-6 py-6 shadow-soft sm:px-7 sm:py-7">
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

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Your groups</h2>
          <p className="text-sm text-muted-foreground">
            A quick read on where you stand across every shared circle.
          </p>
        </div>

        <GroupList groups={groups} />
      </section>
    </div>
  );
}
