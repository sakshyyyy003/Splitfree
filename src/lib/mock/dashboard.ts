import dashboardGroups from "../../../mockdata/dashboard-groups.json";
import dashboardOverallBalances from "../../../mockdata/dashboard-overall-balances.json";
import dashboardUser from "../../../mockdata/dashboard-user.json";

import type {
  DashboardGroup,
  DashboardOverallBalances,
  DashboardUser,
} from "@/types/dashboard";

export async function getMockDashboardUser() {
  return dashboardUser as DashboardUser;
}

export async function getMockDashboardGroups() {
  return dashboardGroups as DashboardGroup[];
}

export async function getMockDashboardOverallBalances() {
  return dashboardOverallBalances as DashboardOverallBalances;
}
