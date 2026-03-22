import "server-only"

import { cache } from "react"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// React cache deduplicates within a single server request.
// Multiple queries calling createClient() reuse the same instance.
export const createClient = cache(async () => {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored, as middleware handles session refresh.
          }
        },
      },
    },
  )
})
