"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { recordSettlement } from "@/actions/settlement";
import type { GroupMember, GroupSimplifiedDebt } from "@/types/group-detail";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// -------------------------------------------------------
// Constants
// -------------------------------------------------------

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function formatINR(amount: number): string {
  return currencyFormatter.format(amount);
}

function getInitials(value: string): string {
  return value
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

// -------------------------------------------------------
// Form schema (UI-level, amount only — group/user ids
// are managed outside react-hook-form)
// -------------------------------------------------------

const settleUpFormSchema = z.object({
  amount: z
    .number({ error: "Amount must be a number" })
    .positive({ error: "Amount must be greater than zero" })
    .max(9999999999.99, { error: "Amount exceeds maximum allowed value" }),
  notes: z
    .string()
    .max(5000, { error: "Notes must be 5000 characters or fewer" })
    .optional(),
});

type SettleUpFormValues = z.infer<typeof settleUpFormSchema>;

// -------------------------------------------------------
// Props
// -------------------------------------------------------

type SettleUpFormProps = {
  groupId: string;
  simplifiedDebts: GroupSimplifiedDebt[];
  members: GroupMember[];
  currentUserId: string;
};

// -------------------------------------------------------
// Component
// -------------------------------------------------------

export function SettleUpForm({
  groupId,
  simplifiedDebts,
  members,
  currentUserId,
}: SettleUpFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Compute initial selection from ?from= and ?to= query params
  const initialDebtIndex = (() => {
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    if (!fromParam || !toParam) return null;

    const matchIndex = simplifiedDebts.findIndex(
      (debt) => debt.fromUserId === fromParam && debt.toUserId === toParam,
    );

    return matchIndex !== -1 ? matchIndex : null;
  })();

  const [selectedDebtIndex, setSelectedDebtIndex] = useState<number | null>(
    initialDebtIndex,
  );

  const selectedDebt =
    selectedDebtIndex !== null ? simplifiedDebts[selectedDebtIndex] ?? null : null;

  const initialAmount =
    initialDebtIndex !== null
      ? simplifiedDebts[initialDebtIndex]?.amount
      : undefined;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SettleUpFormValues>({
    resolver: zodResolver(settleUpFormSchema),
    defaultValues: {
      amount: (initialAmount ?? undefined) as unknown as number,
      notes: "",
    },
  });

  function handleDebtSelect(index: number) {
    const debt = simplifiedDebts[index];
    if (!debt) return;

    setSelectedDebtIndex(index);
    reset({
      amount: debt.amount,
      notes: "",
    });
  }

  function handleDeselect() {
    setSelectedDebtIndex(null);
    reset({
      amount: undefined as unknown as number,
      notes: "",
    });
  }

  function findMember(userId: string): GroupMember | undefined {
    return members.find((m) => m.userId === userId);
  }

  function onSubmit(formValues: SettleUpFormValues) {
    if (!selectedDebt) {
      toast.error("Please select a debt to settle");
      return;
    }

    startTransition(async () => {
      try {
        const result = await recordSettlement({
          group_id: groupId,
          paid_by: selectedDebt.fromUserId,
          paid_to: selectedDebt.toUserId,
          amount: formValues.amount,
          notes: formValues.notes || undefined,
        });

        if (result.error) {
          toast.error(result.error.message);
          return;
        }

        toast.success("Settlement recorded successfully!");
        router.push(`/groups/${groupId}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Something went wrong";
        toast.error(message);
      }
    });
  }

  // -------------------------------------------------------
  // Empty state
  // -------------------------------------------------------

  if (simplifiedDebts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <CheckCircle2 className="size-12 text-emerald-600" />
          <div className="space-y-1">
            <p className="text-lg font-bold">Everyone is settled up!</p>
            <p className="text-sm text-muted-foreground">
              There are no outstanding balances in this group.
            </p>
          </div>
          <Link href={`/groups/${groupId}`}>
            <Button variant="outline">Back to group</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------
  // Debt selection list
  // -------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Debt selection */}
      <Card>
        <CardHeader>
          <CardTitle>Outstanding balances</CardTitle>
          <CardDescription>
            Select a balance to record a settlement payment.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {simplifiedDebts.map((debt, index) => {
            const isSelected = selectedDebtIndex === index;
            const fromMember = findMember(debt.fromUserId);
            const toMember = findMember(debt.toUserId);

            return (
              <button
                key={`${debt.fromUserId}-${debt.toUserId}`}
                type="button"
                onClick={() =>
                  isSelected ? handleDeselect() : handleDebtSelect(index)
                }
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border/70 bg-background/85 hover:bg-secondary/50",
                )}
              >
                <Avatar size="sm">
                  {fromMember?.avatarUrl ? (
                    <AvatarImage
                      src={fromMember.avatarUrl}
                      alt={debt.fromName}
                    />
                  ) : null}
                  <AvatarFallback>{getInitials(debt.fromName)}</AvatarFallback>
                </Avatar>

                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-sm font-semibold">
                    {debt.fromUserId === currentUserId
                      ? "You"
                      : debt.fromName}
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-semibold">
                    {debt.toUserId === currentUserId
                      ? "You"
                      : debt.toName}
                  </span>
                </div>

                <Avatar size="sm">
                  {toMember?.avatarUrl ? (
                    <AvatarImage
                      src={toMember.avatarUrl}
                      alt={debt.toName}
                    />
                  ) : null}
                  <AvatarFallback>{getInitials(debt.toName)}</AvatarFallback>
                </Avatar>

                <span className="ml-1 whitespace-nowrap text-sm font-bold tabular-nums">
                  {formatINR(debt.amount)}
                </span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Settlement form — visible only when a debt is selected */}
      {selectedDebt && (
        <Card>
          <CardHeader>
            <CardTitle>Record payment</CardTitle>
            <CardDescription>
              {selectedDebt.fromUserId === currentUserId ? "You pay" : selectedDebt.fromName + " pays"}{" "}
              {selectedDebt.toUserId === currentUserId ? "you" : selectedDebt.toName}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Payer and recipient display */}
            <div className="mb-5 flex items-center justify-center gap-4">
              <div className="flex flex-col items-center gap-1.5">
                <Avatar>
                  {findMember(selectedDebt.fromUserId)?.avatarUrl ? (
                    <AvatarImage
                      src={
                        findMember(selectedDebt.fromUserId)!.avatarUrl!
                      }
                      alt={selectedDebt.fromName}
                    />
                  ) : null}
                  <AvatarFallback>
                    {getInitials(selectedDebt.fromName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-semibold text-muted-foreground">
                  {selectedDebt.fromUserId === currentUserId
                    ? "You"
                    : selectedDebt.fromName}
                </span>
              </div>

              <ArrowRight className="size-5 text-muted-foreground" />

              <div className="flex flex-col items-center gap-1.5">
                <Avatar>
                  {findMember(selectedDebt.toUserId)?.avatarUrl ? (
                    <AvatarImage
                      src={findMember(selectedDebt.toUserId)!.avatarUrl!}
                      alt={selectedDebt.toName}
                    />
                  ) : null}
                  <AvatarFallback>
                    {getInitials(selectedDebt.toName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-semibold text-muted-foreground">
                  {selectedDebt.toUserId === currentUserId
                    ? "You"
                    : selectedDebt.toName}
                </span>
              </div>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-5"
            >
              {/* Amount */}
              <Field>
                <Label htmlFor="amount">Amount (INR)</Label>
                <Input
                  id="amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  autoComplete="off"
                  aria-invalid={!!errors.amount}
                  {...register("amount", { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Full amount: {formatINR(selectedDebt.amount)}
                </p>
                <FieldError>{errors.amount?.message}</FieldError>
              </Field>

              {/* Notes */}
              <Field>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g. Paid via UPI"
                  autoComplete="off"
                  rows={2}
                  className="min-h-0"
                  {...register("notes")}
                />
                <FieldError>{errors.notes?.message}</FieldError>
              </Field>

              <Button type="submit" size="lg" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                Record Settlement
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
