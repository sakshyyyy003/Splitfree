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
      <section className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Settlements
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Settle up
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Record a payment between group members to settle outstanding balances.
        </p>
      </section>

      <SettleUpForm
        groupId={groupId}
        simplifiedDebts={simplifiedDebts}
        members={members}
        currentUserId={user.id}
      />
    </div>
  );
}
