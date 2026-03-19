import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import {
  AUTH_ROUTES,
  AUTHENTICATED_REDIRECT,
  PUBLIC_ROUTES,
  UNAUTHENTICATED_REDIRECT,
} from "@/constants/routes"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh the auth token by validating the user with the Supabase Auth server.
  // getUser() makes a network call to verify the JWT, unlike getSession()
  // which only reads from cookies without validation.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route)

  // Public routes are accessible by anyone — no redirect needed.
  if (isPublicRoute) {
    return supabaseResponse
  }

  // Unauthenticated users trying to access a protected route → send to login.
  if (!user && !isAuthRoute) {
    const redirectUrl = new URL(UNAUTHENTICATED_REDIRECT, request.nextUrl.origin)
    return NextResponse.redirect(redirectUrl)
  }

  // Authenticated users visiting an auth route (login/signup) → send to dashboard.
  if (user && isAuthRoute) {
    const redirectUrl = new URL(AUTHENTICATED_REDIRECT, request.nextUrl.origin)
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}
