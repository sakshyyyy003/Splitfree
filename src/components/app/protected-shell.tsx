"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Clock,
  LayoutDashboard,
  LogOut,
  Plus,
  UserRound,
  Users,
} from "lucide-react";

import { signOut } from "@/actions/auth";
import { PROFILE_ROUTE } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ProtectedShellProps = {
  children: React.ReactNode;
  user: {
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
  };
};

const navigationItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (pathname: string, searchParams: URLSearchParams) =>
      (pathname === "/dashboard" && searchParams.get("tab") !== "activity") ||
      pathname.startsWith("/groups") ||
      pathname.startsWith("/expenses"),
  },
  {
    href: "/dashboard?tab=activity",
    label: "Activity",
    icon: Clock,
    match: (pathname: string, searchParams: URLSearchParams) =>
      pathname === "/dashboard" && searchParams.get("tab") === "activity",
  },
  {
    href: PROFILE_ROUTE,
    label: "Profile",
    icon: UserRound,
    match: (pathname: string, _searchParams: URLSearchParams) =>
      pathname === PROFILE_ROUTE || pathname.startsWith(`${PROFILE_ROUTE}/`),
  },
] as const;

type MobileNavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (pathname: string, searchParams: URLSearchParams) => boolean;
};

const mobileNavLeft: MobileNavItem[] = [
  {
    href: "/dashboard?tab=groups",
    label: "Groups",
    icon: Users,
    match: (p, sp) => p === "/dashboard" && (sp.get("tab") ?? "groups") === "groups",
  },
  {
    href: "/dashboard?tab=people",
    label: "People",
    icon: UserRound,
    match: (p, sp) => p === "/dashboard" && sp.get("tab") === "people",
  },
];

const mobileNavRight: MobileNavItem[] = [
  {
    href: "/dashboard?tab=activity",
    label: "Activity",
    icon: Clock,
    match: (p, sp) => p === "/dashboard" && sp.get("tab") === "activity",
  },
  {
    href: PROFILE_ROUTE,
    label: "Profile",
    icon: UserRound,
    match: (p) => p === PROFILE_ROUTE || p.startsWith(`${PROFILE_ROUTE}/`),
  },
];

function MobileBottomNav({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams();

  function renderTab(item: MobileNavItem) {
    const isActive = item.match(pathname, searchParams);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold uppercase tracking-wide-custom transition-colors",
          isActive
            ? "text-hotgreen"
            : "text-white/50 hover:text-white",
        )}
      >
        <div
          className={cn(
            "flex size-6 items-center justify-center",
            isActive && "bg-hotgreen text-black rounded-sm",
          )}
        >
          <Icon className="size-4" />
        </div>
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 bg-black border-t-2 border-hotgreen px-2 pb-3 pt-2 lg:hidden">
      <div className="mx-auto flex max-w-md items-center">
        {/* Left tabs */}
        {mobileNavLeft.map(renderTab)}

        {/* Center CTA */}
        <div className="flex flex-col items-center justify-center px-3 -mt-5">
          <Link
            href="/expenses/direct/new"
            aria-label="Add new"
            className="flex size-12 items-center justify-center rounded-full bg-hotgreen text-black shadow-[0_0_12px_rgba(0,255,100,0.4)]"
          >
            <Plus className="size-6" strokeWidth={3} />
          </Link>
        </div>

        {/* Right tabs */}
        {mobileNavRight.map(renderTab)}
      </div>
    </nav>
  );
}

function getInitials(value: string) {
  const parts = value
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "SF";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function ProtectedShell({ children, user }: ProtectedShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const displayName = user.name?.trim() || user.email || "SplitFree member";

  return (
    <div className="min-h-screen lg:p-4">
      <div className="flex min-h-screen lg:min-h-[calc(100vh-2rem)] lg:gap-4">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 shrink-0 bg-sidebar px-5 py-6 text-sidebar-foreground lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2">
            <p className="text-xl font-bold tracking-tight">
              SPLIT<span className="text-hotgreen">FREE</span>
            </p>
          </div>

          <nav className="mt-8 space-y-1">
            {navigationItems.map((item) => {
              const isActive = item.match(pathname, searchParams);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-ultra transition-colors",
                    isActive
                      ? "bg-hotgreen text-black"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-sidebar-border pt-4">
            <div className="flex items-center gap-3 px-2">
              <Avatar size="sm">
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={displayName} />
                ) : null}
                <AvatarFallback className="bg-hotgreen text-black">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{displayName}</p>
                <p className="truncate text-xs text-sidebar-foreground/65">
                  {user.email ?? "Signed in"}
                </p>
              </div>
              <form action={signOut}>
                <button
                  type="submit"
                  aria-label="Sign out"
                  className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="size-4" />
                </button>
              </form>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:min-h-[calc(100vh-2rem)]">
          {/* Mobile Header */}
          <header className="sticky top-0 z-20 bg-black px-4 py-4 lg:hidden">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <p className="text-xl font-bold tracking-tight text-white">
                SPLIT<span className="text-hotgreen">FREE</span>
              </p>
              <Link href={PROFILE_ROUTE} aria-label="Open profile">
                <Avatar size="sm">
                  {user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={displayName} />
                  ) : null}
                  <AvatarFallback className="bg-hotgreen text-black">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-10 lg:pb-10">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>

          {/* Mobile Bottom Nav */}
          <Suspense>
            <MobileBottomNav pathname={pathname} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
