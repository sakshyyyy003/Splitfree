import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { UNAUTHENTICATED_REDIRECT } from "@/constants/routes";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect(UNAUTHENTICATED_REDIRECT);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Welcome to SplitFree, {data.user.email}.
      </p>
    </div>
  );
}
