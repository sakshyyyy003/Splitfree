"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Sparkles,
  UserRound,
} from "lucide-react";

import { signOut } from "@/actions/auth";
import { PROFILE_ROUTE } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

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
    match: (pathname: string) => pathname === "/dashboard",
  },
  {
    href: PROFILE_ROUTE,
    label: "Profile",
    icon: UserRound,
    match: (pathname: string) =>
      pathname === PROFILE_ROUTE || pathname.startsWith(`${PROFILE_ROUTE}/`),
  },
] as const;

export function ProtectedShell({ children, user }: ProtectedShellProps) {
  const pathname = usePathname();
  const displayName = user.name?.trim() || user.email || "SplitFree member";

  return (
    <div className="min-h-screen lg:p-4">
      <div className="flex min-h-screen lg:min-h-[calc(100vh-2rem)] lg:gap-4">
        <aside className="hidden w-64 shrink-0 rounded-[2.25rem] border border-sidebar-border bg-sidebar px-5 py-6 text-sidebar-foreground shadow-soft lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2">
            <div className="flex size-12 items-center justify-center rounded-3xl bg-sidebar-primary text-sidebar-primary-foreground shadow-subtle">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="font-display text-lg font-bold tracking-tight">
                SplitFree
              </p>
              <p className="text-sm text-sidebar-foreground/65">
                Shared money, less friction
              </p>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {navigationItems.map((item) => {
              const isActive = item.match(pathname);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors",
                    isActive
                      ? "border-sidebar-primary/10 bg-sidebar-primary text-sidebar-primary-foreground shadow-subtle"
                      : "border-transparent text-sidebar-foreground/75 hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-[1.75rem] border border-sidebar-border bg-sidebar-accent/70 p-4">
            <div className="flex items-center gap-3">
              <Avatar size="sm" className="ring-1 ring-sidebar-border">
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={displayName} />
                ) : null}
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{displayName}</p>
                <p className="truncate text-xs text-sidebar-foreground/65">
                  {user.email ?? "Signed in"}
                </p>
              </div>
            </div>

            <form action={signOut} className="mt-4">
              <Button
                type="submit"
                variant="secondary"
                className="w-full justify-center border-sidebar-border bg-sidebar-primary/90 text-sidebar-primary-foreground hover:bg-sidebar-primary"
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </form>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col lg:min-h-[calc(100vh-2rem)]">
          <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 px-4 py-4 backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div>
                <p className="font-display text-xl font-bold tracking-tight">
                  SplitFree
                </p>
                <p className="text-sm text-muted-foreground">
                  {getCurrentLabel(pathname)}
                </p>
              </div>
              <Link href={PROFILE_ROUTE} aria-label="Open profile">
                <Avatar size="sm">
                  {user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={displayName} />
                  ) : null}
                  <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 pb-28 sm:px-6 lg:rounded-[2.25rem] lg:border lg:border-border/80 lg:bg-white/85 lg:px-8 lg:py-10 lg:pb-10 lg:shadow-soft">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>

          <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-background/95 px-3 pb-3 pt-2 backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-md items-center gap-2 rounded-[1.75rem] border border-border/80 bg-white/90 p-2 shadow-panel">
              {navigationItems.map((item) => {
                const isActive = item.match(pathname);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-xs font-semibold transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <form action={signOut} className="flex-1">
                <Button
                  type="submit"
                  variant="outline"
                  className="h-full w-full flex-col gap-1 rounded-2xl px-3 py-2 text-xs font-semibold"
                >
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </form>
            </div>
          </nav>
        </div>
      </div>
    </div>
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

function getCurrentLabel(pathname: string) {
  const currentItem = navigationItems.find((item) => item.match(pathname));

  return currentItem?.label ?? "Workspace";
}
