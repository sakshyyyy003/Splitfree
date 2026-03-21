import { requireAuthenticatedUser } from "@/lib/auth/user";
import { ProtectedShell } from "@/components/app/protected-shell";
import { getDashboardUser } from "@/lib/queries/profile";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAuthenticatedUser();
  const user = await getDashboardUser();

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
