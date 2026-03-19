/**
 * Route classification for auth redirect logic in middleware.
 *
 * Protected by default: any route NOT listed in PUBLIC_ROUTES or AUTH_ROUTES
 * requires authentication. This is safer than allowlisting protected paths.
 */

/** Routes accessible by anyone, regardless of auth status. */
export const PUBLIC_ROUTES = ["/", "/auth/callback"] as const;

/** Routes only for unauthenticated users (login/signup flow). */
export const AUTH_ROUTES = ["/login", "/signup"] as const;

/** Where to send authenticated users who visit an auth route. */
export const AUTHENTICATED_REDIRECT = "/dashboard";

/** Where to send unauthenticated users who visit a protected route. */
export const UNAUTHENTICATED_REDIRECT = "/login";

/** Protected route: user profile page. */
export const PROFILE_ROUTE = "/profile";
