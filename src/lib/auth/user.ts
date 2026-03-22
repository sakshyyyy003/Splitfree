import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { UNAUTHENTICATED_REDIRECT } from "@/constants/routes";
import { createClient } from "@/lib/supabase/server";

// React cache deduplicates this call within a single request.
// Layout + page calling requireAuthenticatedUser() will only hit Supabase once.
export const requireAuthenticatedUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect(UNAUTHENTICATED_REDIRECT);
  }

  return data.user;
});
