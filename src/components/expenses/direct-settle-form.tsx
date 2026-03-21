"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { recordSettlement } from "@/actions/settlement";
import type { DashboardCounterpartyBalance } from "@/types/dashboard";

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
// Helpers
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
// Form schema
// -------------------------------------------------------

const directSettleFormSchema = z.object({
  amount: z
    .number({ error: "Amount must be a number" })
    .positive({ error: "Amount must be greater than zero" })
    .max(9999999999.99, { error: "Amount exceeds maximum allowed value" }),
  notes: z
    .string()
    .max(5000, { error: "Notes must be 5000 characters or fewer" })
    .optional(),
});

type DirectSettleFormValues = z.infer<typeof directSettleFormSchema>;

// -------------------------------------------------------
// Props
// -------------------------------------------------------

type DirectSettleFormProps = {
  currentUserId: string;
  counterparties: DashboardCounterpartyBalance[];
  preselectedCounterpartyId: string | null;
};

// -------------------------------------------------------
// Component
// -------------------------------------------------------

export function DirectSettleForm({
  currentUserId,
  counterparties,
  preselectedCounterpartyId,
}: DirectSettleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Only show counterparties with outstanding balances
  const unsettled = counterparties.filter((c) => c.netBalance !== 0);

  const initialIndex = preselectedCounterpartyId
    ? unsettled.findIndex((c) => c.userId === preselectedCounterpartyId)
    : -1;

  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    initialIndex !== -1 ? initialIndex : null,
  );

  const selected = selectedIndex !== null ? unsettled[selectedIndex] ?? null : null;

  const initialAmount =
    selected ? Math.abs(selected.netBalance) : undefined;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DirectSettleFormValues>({
    resolver: zodResolver(directSettleFormSchema),
    defaultValues: {
      amount: (initialAmount ?? undefined) as unknown as number,
      notes: "",
    },
  });

  function handleSelect(index: number) {
    const counterparty = unsettled[index];
    if (!counterparty) return;

    setSelectedIndex(index);
    reset({
      amount: Math.abs(counterparty.netBalance),
      notes: "",
    });
  }

  function handleDeselect() {
    setSelectedIndex(null);
    reset({
      amount: undefined as unknown as number,
      notes: "",
    });
  }

  function onSubmit(formValues: DirectSettleFormValues) {
    if (!selected) {
      toast.error("Please select a person to settle with");
      return;
    }

    // Determine payer direction:
    // netBalance < 0 means current user owes the counterparty → current user pays
    // netBalance > 0 means counterparty owes current user → counterparty pays
    const paidBy = selected.netBalance < 0 ? currentUserId : selected.userId;
    const paidTo = selected.netBalance < 0 ? selected.userId : currentUserId;

    startTransition(async () => {
      try {
        const result = await recordSettlement({
          group_id: null,
          paid_by: paidBy,
          paid_to: paidTo,
          amount: formValues.amount,
          notes: formValues.notes || undefined,
        });

        if (result.error) {
          toast.error(result.error.message);
          return;
        }

        toast.success("Settlement recorded successfully!");
        router.push("/dashboard?tab=people");
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

  if (unsettled.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <CheckCircle2 className="size-12 text-emerald-600" />
          <div className="space-y-1">
            <p className="text-lg font-bold">All settled up!</p>
            <p className="text-sm text-muted-foreground">
              You have no outstanding balances with anyone.
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">Back to dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------
  // Counterparty selection + form
  // -------------------------------------------------------

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Outstanding balances</CardTitle>
          <CardDescription>
            Select a person to record a settlement payment.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {unsettled.map((counterparty, index) => {
            const isSelected = selectedIndex === index;
            const owesYou = counterparty.netBalance > 0;

            return (
              <button
                key={counterparty.userId}
                type="button"
                onClick={() =>
                  isSelected ? handleDeselect() : handleSelect(index)
                }
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border bg-card hover:bg-secondary/50",
                )}
              >
                <Avatar size="sm">
                  {counterparty.avatarUrl ? (
                    <AvatarImage
                      src={counterparty.avatarUrl}
                      alt={counterparty.name}
                    />
                  ) : null}
                  <AvatarFallback>
                    {getInitials(counterparty.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">
                    {counterparty.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {counterparty.groupLabel}
                  </span>
                </div>

                <div className="text-right">
                  <span
                    className={cn(
                      "whitespace-nowrap text-sm font-bold tabular-nums",
                      owesYou ? "text-emerald-700" : "text-rose-700",
                    )}
                  >
                    {formatINR(Math.abs(counterparty.netBalance))}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {owesYou ? "owes you" : "you owe"}
                  </p>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>Record payment</CardTitle>
            <CardDescription>
              {selected.netBalance < 0
                ? `You pay ${selected.name}`
                : `${selected.name} pays you`}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mb-5 flex items-center justify-center gap-4">
              <div className="flex flex-col items-center gap-1.5">
                <Avatar>
                  {selected.netBalance < 0 ? null : selected.avatarUrl ? (
                    <AvatarImage
                      src={selected.avatarUrl}
                      alt={selected.name}
                    />
                  ) : null}
                  <AvatarFallback>
                    {selected.netBalance < 0
                      ? "You"
                      : getInitials(selected.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-semibold text-muted-foreground">
                  {selected.netBalance < 0 ? "You" : selected.name}
                </span>
              </div>

              <ArrowRight className="size-5 text-muted-foreground" />

              <div className="flex flex-col items-center gap-1.5">
                <Avatar>
                  {selected.netBalance < 0 && selected.avatarUrl ? (
                    <AvatarImage
                      src={selected.avatarUrl}
                      alt={selected.name}
                    />
                  ) : null}
                  <AvatarFallback>
                    {selected.netBalance < 0
                      ? getInitials(selected.name)
                      : "You"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-semibold text-muted-foreground">
                  {selected.netBalance < 0 ? selected.name : "You"}
                </span>
              </div>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-5"
            >
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
                  Full amount: {formatINR(Math.abs(selected.netBalance))}
                </p>
                <FieldError>{errors.amount?.message}</FieldError>
              </Field>

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
