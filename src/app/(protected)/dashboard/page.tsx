import { Suspense } from "react";

import { requireAuthenticatedUser } from "@/lib/auth/user";

import { DashboardContent } from "./dashboard-content";
import { DashboardHeader } from "./dashboard-header";

function DashboardHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-1.5 animate-pulse">
      <div className="h-10 w-72 rounded bg-muted" />
      <div className="h-14 w-full rounded bg-muted" />
    </div>
  );
}

function DashboardContentSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex gap-2">
        <div className="h-11 w-28 rounded bg-muted" />
        <div className="h-11 w-28 rounded bg-muted" />
      </div>
      <div className="space-y-3 mt-4">
        <div className="h-20 rounded-lg bg-muted" />
        <div className="h-20 rounded-lg bg-muted" />
        <div className="h-20 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [user, params] = await Promise.all([
    requireAuthenticatedUser(),
    searchParams,
  ]);
  const activeTab = params.tab ?? "groups";

  return (
    <div className="mx-auto max-w-[800px] space-y-4">
      {activeTab !== "activity" && (
        <Suspense fallback={<DashboardHeaderSkeleton />}>
          <DashboardHeader />
        </Suspense>
      )}
      <Suspense fallback={<DashboardContentSkeleton />}>
        <DashboardContent activeTab={activeTab} userId={user.id} />
      </Suspense>
    </div>
  );
}
