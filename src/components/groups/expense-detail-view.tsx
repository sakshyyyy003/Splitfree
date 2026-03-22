import Link from "next/link";
import {
  ArrowLeft,
  CircleHelp,
  House,
  type LucideIcon,
  ReceiptText,
  ShoppingBag,
  Ticket,
  TramFront,
  UtensilsCrossed,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DeleteExpenseButton } from "@/components/groups/delete-expense-button";

import type { GroupDetail, GroupExpenseDetail } from "@/types/group-detail";

type ExpenseDetailViewProps = {
  group: GroupDetail;
  expense: GroupExpenseDetail;
  canDelete: boolean;
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const addedDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});

const categoryIcons: Record<string, LucideIcon> = {
  food: UtensilsCrossed,
  transport: TramFront,
  accommodation: House,
  entertainment: Ticket,
  utilities: ReceiptText,
  shopping: ShoppingBag,
  default: CircleHelp,
};

export function ExpenseDetailView({
  group,
  expense,
  canDelete,
}: ExpenseDetailViewProps) {
  const Icon = categoryIcons[expense.category] ?? categoryIcons.default;

  return (
    <div className="space-y-8">
      <section>
        <Link
          href={`/groups/${group.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to {group.name}
        </Link>

        <div className="mt-10 flex flex-col gap-4 px-1 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-[18px]">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[3px] bg-white">
              <Icon className="size-5" />
            </div>
            <div className="pb-px">
              <p className="text-[16px] font-bold leading-[24.75px] text-black">
                {expense.title}
              </p>
              <p className="text-[14px] leading-5 text-[#404040]">
                Added by {expense.paidByName} on{" "}
                {addedDateFormatter.format(new Date(expense.incurredOn))}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-start sm:gap-5">
            <p className="text-[26px] font-bold leading-10 tracking-[-0.9px] text-black">
              {formatCurrency(expense.amount, expense.currency)}
            </p>
            <div className="flex items-center gap-3">
              <Link
                href={`/groups/${group.id}/expenses/${expense.id}/edit`}
                className="inline-flex h-11 items-center justify-center border-2 border-foreground bg-background px-5 text-sm font-bold uppercase transition-colors hover:bg-secondary"
              >
                Edit
              </Link>
              <DeleteExpenseButton
                expenseId={expense.id}
                groupId={group.id}
                canDelete={canDelete}
              />
            </div>
          </div>
        </div>
      </section>

      <SplitTree expense={expense} />
    </div>
  );
}

function formatCurrency(amount: number, currency: string) {
  if (currency === "INR") {
    return currencyFormatter.format(amount);
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getNetParticipantCopy(amount: number, currency: string) {
  if (amount > 0) {
    return `Gets back ${formatCurrency(amount, currency)}`;
  }

  if (amount < 0) {
    return `Owes ${formatCurrency(Math.abs(amount), currency)}`;
  }

  return "Settled";
}

function getNetTone(amount: number) {
  if (amount > 0) {
    return "text-primary";
  }

  if (amount < 0) {
    return "text-amber-700";
  }

  return "text-foreground";
}

function SplitTree({ expense }: { expense: GroupExpenseDetail }) {
  const payer = expense.participants.find(
    (p) => p.userId === expense.paidByUserId,
  );
  const owes = expense.participants.filter(
    (p) => p.userId !== expense.paidByUserId && p.owedAmount > 0,
  );

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-center gap-3">
        <Avatar size="sm">
          {payer?.avatarUrl ? (
            <AvatarImage src={payer.avatarUrl} alt={payer?.name ?? "Payer"} />
          ) : null}
          <AvatarFallback className="bg-[#00d26a] text-black">
            {getInitials(payer?.name ?? "?")}
          </AvatarFallback>
        </Avatar>
        <p className="text-[16px] font-medium leading-[24.75px] text-black/90">
          {payer?.name ?? expense.paidByName} paid{" "}
          {formatCurrency(expense.amount, expense.currency)}
        </p>
      </div>

      {owes.length > 0 && (
        <div className="relative ml-[16px] mt-[10px] border-l border-border pl-[34px]">
          {owes.map((participant, index) => (
            <div
              key={participant.userId}
              className={`relative flex items-center gap-3 py-[6px] before:absolute before:left-[-34px] before:top-1/2 before:h-px before:w-[34px] before:bg-border ${index === owes.length - 1 ? "before:content-[''] after:absolute after:left-[-35px] after:top-1/2 after:bottom-[-1px] after:w-[2px] after:bg-card" : ""}`}
            >
              <Avatar size="sm" className="size-[33px]">
                {participant.avatarUrl ? (
                  <AvatarImage
                    src={participant.avatarUrl}
                    alt={participant.name}
                  />
                ) : null}
                <AvatarFallback className="bg-[#f5f5f0] text-black text-xs">
                  {getInitials(participant.name)}
                </AvatarFallback>
              </Avatar>
              <p className="text-[14px] leading-[24.75px] text-black/70">
                {participant.name} owes {payer?.name ?? expense.paidByName}{" "}
                {formatCurrency(participant.owedAmount, expense.currency)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
