import "server-only";

import { redirect } from "next/navigation";

import { UNAUTHENTICATED_REDIRECT } from "@/constants/routes";
import { createClient } from "@/lib/supabase/server";

export async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect(UNAUTHENTICATED_REDIRECT);
  }

  return data.user;
}
