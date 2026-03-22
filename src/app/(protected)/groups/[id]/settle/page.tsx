import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireAuthenticatedUser } from "@/lib/auth/user";
import { getGroupBalances } from "@/lib/queries/balances";
import { getGroupMembers } from "@/lib/queries/group-members";
import { SettleUpForm } from "@/components/groups/settle-up-form";

type SettleUpPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SettleUpPage({ params }: SettleUpPageProps) {
  const [{ id: groupId }, user] = await Promise.all([
    params,
    requireAuthenticatedUser(),
  ]);

  const [{ simplifiedDebts }, members] = await Promise.all([
    getGroupBalances(groupId),
    getGroupMembers(groupId),
  ]);

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <Link
        href={`/groups/${groupId}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to group
      </Link>

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Settle up
      </h1>

      <Suspense>
        <SettleUpForm
          groupId={groupId}
          simplifiedDebts={simplifiedDebts}
          members={members}
          currentUserId={user.id}
        />
      </Suspense>
    </div>
  );
}
