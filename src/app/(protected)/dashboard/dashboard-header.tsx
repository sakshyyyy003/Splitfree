import { MobileBalanceBanner } from "@/components/dashboard/overall-balance-view";
import { getOverallBalances } from "@/lib/queries/balances";
import { getDashboardUser } from "@/lib/queries/profile";

export async function DashboardHeader() {
  const [dashboardUser, overallBalances] = await Promise.all([
    getDashboardUser(),
    getOverallBalances(),
  ]);
  const displayName = dashboardUser.name ?? dashboardUser.email ?? "there";

  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-[30px] font-bold leading-10 tracking-[-0.9px]">
        Welcome back, {displayName}
      </h1>
      <MobileBalanceBanner summary={overallBalances.summary} />
    </div>
  );
}
