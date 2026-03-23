import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Handshake } from "lucide-react";

import { requireAuthenticatedUser } from "@/lib/auth/user";
import { getGroupDetail } from "@/lib/queries/group";
import { getSettlementDetail } from "@/lib/queries/settlements";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DeleteSettlementButton } from "@/components/groups/delete-settlement-button";

type SettlementDetailPageProps = {
  params: Promise<{
    id: string;
    settlementId: string;
  }>;
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function SettlementDetailPage({
  params,
}: SettlementDetailPageProps) {
  const { id: groupId, settlementId } = await params;
  const user = await requireAuthenticatedUser();
  const [group, settlement] = await Promise.all([
    getGroupDetail(groupId, user.id),
    getSettlementDetail(settlementId),
  ]);

  if (!group || !settlement) {
    notFound();
  }

  const canDelete =
    user.id === settlement.paidByUserId || user.id === settlement.paidToUserId;

  const payerName =
    settlement.paidByUserId === user.id ? "You" : settlement.paidByName;
  const payeeName =
    settlement.paidToUserId === user.id ? "You" : settlement.paidToName;

  return (
    <div className="space-y-8">
      <section>
        <Link
          href={`/groups/${groupId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to {group.name}
        </Link>

        <div className="mt-10 flex flex-col gap-4 px-1 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-[18px]">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[3px] bg-emerald-100">
              <Handshake className="size-5 text-emerald-700" />
            </div>
            <div className="pb-px">
              <p className="text-[16px] font-bold leading-[24.75px] text-black">
                Settlement
              </p>
              <p className="text-[14px] leading-5 text-[#404040]">
                {payerName} paid {payeeName.toLowerCase()} on{" "}
                {dateFormatter.format(new Date(settlement.createdAt))}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-start sm:gap-5">
            <p className="text-[26px] font-bold leading-10 tracking-[-0.9px] text-emerald-700">
              {currencyFormatter.format(settlement.amount)}
            </p>
            {canDelete && (
              <DeleteSettlementButton
                settlementId={settlement.id}
                groupId={groupId}
              />
            )}
          </div>
        </div>
      </section>

      <div className="rounded-lg border border-border bg-card px-5 py-6">
        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <Avatar>
              <AvatarFallback className="bg-emerald-100 text-emerald-800">
                {getInitials(settlement.paidByName)}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm font-semibold">{payerName}</p>
          </div>

          <div className="flex flex-col items-center gap-1">
            <ArrowRight className="size-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">paid</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Avatar>
              <AvatarFallback className="bg-[#f5f5f0] text-black">
                {getInitials(settlement.paidToName)}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm font-semibold">{payeeName}</p>
          </div>
        </div>

        {settlement.notes && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {settlement.notes}
          </p>
        )}
      </div>
    </div>
  );
}
