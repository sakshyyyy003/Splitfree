"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Plus,
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
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 shrink-0 bg-sidebar px-5 py-6 text-sidebar-foreground lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2">
            <p className="text-xl font-bold tracking-tight">
              SPLIT<span className="text-hotgreen">FREE</span>
            </p>
          </div>

          <nav className="mt-8 space-y-1">
            {navigationItems.map((item) => {
              const isActive = item.match(pathname);
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
            </div>

            <form action={signOut} className="mt-4">
              <Button
                type="submit"
                variant="outline"
                className="w-full justify-center border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-hotgreen hover:text-black hover:border-hotgreen"
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </form>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col lg:min-h-[calc(100vh-2rem)]">
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
          <nav className="fixed inset-x-0 bottom-0 z-30 bg-black border-t-2 border-hotgreen px-3 pb-3 pt-2 lg:hidden">
            <div className="mx-auto flex max-w-md items-center gap-2">
              {navigationItems.map((item) => {
                const isActive = item.match(pathname);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wide-custom transition-colors",
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
              })}

              <Link
                href="/dashboard"
                className="flex flex-col items-center justify-center px-3 py-1"
                aria-label="Add new"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-hotgreen text-black">
                  <Plus className="size-5" strokeWidth={3} />
                </div>
              </Link>

              <form action={signOut} className="flex min-w-0 flex-1 justify-center">
                <button
                  type="submit"
                  className="flex flex-col items-center justify-center gap-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wide-custom text-white/50 hover:text-white transition-colors"
                >
                  <div className="flex size-6 items-center justify-center">
                    <LogOut className="size-4" />
                  </div>
                  <span>Sign out</span>
                </button>
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
