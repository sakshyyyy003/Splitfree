import { getProfile } from "@/lib/queries/profile";
import { requireAuthenticatedUser } from "@/lib/auth/user";
import { ProtectedShell } from "@/components/app/protected-shell";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireAuthenticatedUser();
  const profile = await getProfile(user.id);

  return (
    <ProtectedShell
      user={{
        email: user.email ?? null,
        name: profile.name,
        avatarUrl: profile.avatar_url,
      }}
    >
      {children}
    </ProtectedShell>
  );
}
