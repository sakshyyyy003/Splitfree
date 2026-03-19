import { NextResponse } from "next/server";

import { AUTHENTICATED_REDIRECT } from "@/constants/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns a safe redirect path from the `next` query parameter.
 *
 * Rejects values that don't start with a single `/` to prevent
 * open-redirect attacks (e.g. `https://evil.com` or `//evil.com`).
 */
function getSafeRedirectPath(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return AUTHENTICATED_REDIRECT;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeRedirectPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
