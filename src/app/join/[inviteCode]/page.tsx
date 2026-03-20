import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getGroupByInviteCode } from "@/lib/queries/group";
import { JoinGroupCard } from "@/components/groups/join-group-card";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

type JoinPageProps = {
  params: Promise<{
    inviteCode: string;
  }>;
};

export default async function JoinPage({ params }: JoinPageProps) {
  const { inviteCode } = await params;

  const group = await getGroupByInviteCode(inviteCode);

  if (!group) {
    return (
      <Shell>
        <Card className="border-dashed">
          <CardHeader className="items-center gap-3 text-center">
            <CardTitle className="text-2xl">Invalid Invite Link</CardTitle>
            <CardDescription>
              This invite link is invalid or the group no longer exists.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/"
              className={buttonVariants({ variant: "outline", className: "w-full" })}
            >
              Go Home
            </Link>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  // Check if user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = `/login?redirectTo=/join/${inviteCode}`;

    return (
      <Shell>
        <Card className="border-2 border-border bg-card">
          <CardHeader className="items-center gap-3 text-center">
            <CardTitle className="text-2xl">
              Join &ldquo;{group.name}&rdquo;
            </CardTitle>
            <CardDescription>
              Sign in or create an account to join this group.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link
              href={loginUrl}
              className={buttonVariants({ size: "lg", className: "w-full" })}
            >
              Sign in to join
            </Link>
            <Link
              href={`/signup?redirectTo=/join/${inviteCode}`}
              className={buttonVariants({ variant: "outline", size: "lg", className: "w-full" })}
            >
              Create an account
            </Link>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <JoinGroupCard group={group} inviteCode={inviteCode} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <p className="text-xl font-bold tracking-tight">
            SPLIT<span className="text-hotgreen">FREE</span>
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
