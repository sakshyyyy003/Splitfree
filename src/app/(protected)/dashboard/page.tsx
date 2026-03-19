import { requireAuthenticatedUser } from "@/lib/auth/user";

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser();

  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome to SplitFree, {user.email}.
      </p>
    </div>
  );
}
