import dashboardUser from "../../../mockdata/dashboard-user.json";

import { requireAuthenticatedUser } from "@/lib/auth/user";
import { ProtectedShell } from "@/components/app/protected-shell";
import type { DashboardUser } from "@/types/dashboard";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAuthenticatedUser();
  const user = dashboardUser as DashboardUser;

  return (
    <ProtectedShell
      user={{
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      }}
    >
      {children}
    </ProtectedShell>
  );
}
