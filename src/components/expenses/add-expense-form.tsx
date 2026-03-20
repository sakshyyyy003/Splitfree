"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  SPLIT_TYPES,
  type SplitType,
} from "@/lib/validators/expense";
import { calculateSplit, type SplitResult } from "@/lib/algorithms/splits";
import { createExpense } from "@/actions/expenses";
import type { GroupMember } from "@/types/group-detail";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldError } from "@/components/ui/field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// -------------------------------------------------------
// Constants
// -------------------------------------------------------

const EXPENSE_CATEGORIES = [
  "food",
  "transport",
  "accommodation",
  "entertainment",
  "utilities",
  "shopping",
  "other",
] as const;

type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

const categoryLabels: Record<ExpenseCategory, string> = {
  food: "Food",
  transport: "Transport",
  accommodation: "Accommodation",
  entertainment: "Entertainment",
  utilities: "Utilities",
  shopping: "Shopping",
  other: "Other",
};

const splitTypeLabels: Record<SplitType, string> = {
  equal: "Equal",
  exact: "Exact",
  percentage: "Percentage",
  shares: "Shares",
};

const splitTypeInputLabels: Record<SplitType, string> = {
  equal: "",
  exact: "Amount (INR)",
  percentage: "Percentage (%)",
  shares: "Shares",
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function formatINR(amount: number): string {
  return currencyFormatter.format(amount);
}

/** Per-participant custom values for non-equal split types */
type CustomSplitValues = Record<string, number>;

// -------------------------------------------------------
// Form-level schema (UI fields only, not the full payload)
// -------------------------------------------------------

const addExpenseFormSchema = z.object({
  description: z
    .string()
    .min(1, { error: "Description is required" })
    .max(255, { error: "Description must be 255 characters or fewer" }),
  amount: z
    .number({ error: "Amount must be a number" })
    .positive({ error: "Amount must be greater than zero" })
    .max(9999999999.99, { error: "Amount exceeds maximum allowed value" }),
  date: z.string().min(1, { error: "Date is required" }),
  paid_by: z.uuid({ error: "Please select who paid" }),
  split_type: z.enum(SPLIT_TYPES, { error: "Invalid split type" }),
  category: z.enum(EXPENSE_CATEGORIES, { error: "Invalid category" }),
});

type AddExpenseFormValues = z.infer<typeof addExpenseFormSchema>;

// -------------------------------------------------------
// Props
// -------------------------------------------------------

type AddExpenseFormProps = {
  groupId: string;
  members: GroupMember[];
  currentUserId: string;
};

// -------------------------------------------------------
// Component
// -------------------------------------------------------

export function AddExpenseForm({
  groupId,
  members,
  currentUserId,
}: AddExpenseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    () => members.map((m) => m.userId),
  );
  const [customSplitValues, setCustomSplitValues] = useState<CustomSplitValues>(
    {},
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddExpenseFormValues>({
    resolver: zodResolver(addExpenseFormSchema),
    defaultValues: {
      description: "",
      amount: undefined as unknown as number,
      date: format(new Date(), "yyyy-MM-dd"),
      paid_by: currentUserId,
      split_type: "equal",
      category: "other",
    },
  });

  const watchedAmount = watch("amount");
  const watchedDate = watch("date");
  const watchedPaidBy = watch("paid_by");
  const watchedSplitType = watch("split_type");
  const watchedCategory = watch("category");

  // -----------------------------------------------------------
  // Live split preview — recomputes when inputs change
  // -----------------------------------------------------------

  const splitPreview = useMemo<{
    results: SplitResult[];
    error: string | null;
  }>(() => {
    const amount = Number(watchedAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { results: [], error: null };
    }

    if (selectedParticipants.length === 0) {
      return { results: [], error: "No participants selected" };
    }

    try {
      if (watchedSplitType === "equal") {
        return {
          results: calculateSplit({
            splitType: "equal",
            totalAmount: amount,
            participants: selectedParticipants,
          }),
          error: null,
        };
      }

      if (watchedSplitType === "exact") {
        const assignments = selectedParticipants.map((userId) => ({
          userId,
          amount: customSplitValues[userId] ?? 0,
        }));
        return {
          results: calculateSplit({
            splitType: "exact",
            totalAmount: amount,
            participants: assignments,
          }),
          error: null,
        };
      }

      if (watchedSplitType === "percentage") {
        const assignments = selectedParticipants.map((userId) => ({
          userId,
          percent: customSplitValues[userId] ?? 0,
        }));
        return {
          results: calculateSplit({
            splitType: "percentage",
            totalAmount: amount,
            participants: assignments,
          }),
          error: null,
        };
      }

      // shares
      const assignments = selectedParticipants.map((userId) => ({
        userId,
        shares: customSplitValues[userId] ?? 0,
      }));
      return {
        results: calculateSplit({
          splitType: "shares",
          totalAmount: amount,
          participants: assignments,
        }),
        error: null,
      };
    } catch (err) {
      return {
        results: [],
        error: err instanceof Error ? err.message : "Invalid split values",
      };
    }
  }, [
    watchedAmount,
    watchedSplitType,
    selectedParticipants,
    customSplitValues,
  ]);

  // Validation feedback for non-equal split types
  const splitValidation = useMemo<{
    total: number;
    expected: number;
    remaining: number;
    unit: string;
  } | null>(() => {
    if (watchedSplitType === "equal") return null;

    const total = selectedParticipants.reduce(
      (sum, id) => sum + (customSplitValues[id] ?? 0),
      0,
    );

    if (watchedSplitType === "exact") {
      const amount = Number(watchedAmount);
      const expected = Number.isFinite(amount) && amount > 0 ? amount : 0;
      return {
        total: Math.round(total * 100) / 100,
        expected: Math.round(expected * 100) / 100,
        remaining: Math.round((expected - total) * 100) / 100,
        unit: "INR",
      };
    }

    if (watchedSplitType === "percentage") {
      return {
        total: Math.round(total * 100) / 100,
        expected: 100,
        remaining: Math.round((100 - total) * 100) / 100,
        unit: "%",
      };
    }

    // shares — no fixed target, just show total
    return {
      total,
      expected: 0,
      remaining: 0,
      unit: "shares",
    };
  }, [watchedSplitType, watchedAmount, selectedParticipants, customSplitValues]);

  function handleParticipantToggle(userId: string, checked: boolean) {
    setSelectedParticipants((prev) => {
      if (checked) {
        return [...prev, userId];
      }
      return prev.filter((id) => id !== userId);
    });
    // Remove custom value when participant is unchecked
    if (!checked) {
      setCustomSplitValues((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }
  }

  function handleCustomValueChange(userId: string, raw: string) {
    const parsed = parseFloat(raw);
    setCustomSplitValues((prev) => ({
      ...prev,
      [userId]: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
    }));
  }

  function handleSplitTypeChange(newType: SplitType) {
    setValue("split_type", newType, { shouldValidate: true });
    // Reset custom values when switching split types to avoid stale data
    setCustomSplitValues({});
  }

  function handleDateSelect(date: Date | undefined) {
    if (!date) return;
    setValue("date", format(date, "yyyy-MM-dd"), { shouldValidate: true });
    setDatePickerOpen(false);
  }

  function buildSplitsPayload(formValues: AddExpenseFormValues) {
    if (selectedParticipants.length === 0) {
      throw new Error("At least one participant is required");
    }

    let splitResults: SplitResult[];

    switch (formValues.split_type) {
      case "equal": {
        splitResults = calculateSplit({
          splitType: "equal",
          totalAmount: formValues.amount,
          participants: selectedParticipants,
        });
        break;
      }
      case "exact": {
        splitResults = calculateSplit({
          splitType: "exact",
          totalAmount: formValues.amount,
          participants: selectedParticipants.map((userId) => ({
            userId,
            amount: customSplitValues[userId] ?? 0,
          })),
        });
        break;
      }
      case "percentage": {
        splitResults = calculateSplit({
          splitType: "percentage",
          totalAmount: formValues.amount,
          participants: selectedParticipants.map((userId) => ({
            userId,
            percent: customSplitValues[userId] ?? 0,
          })),
        });
        break;
      }
      case "shares": {
        splitResults = calculateSplit({
          splitType: "shares",
          totalAmount: formValues.amount,
          participants: selectedParticipants.map((userId) => ({
            userId,
            shares: customSplitValues[userId] ?? 0,
          })),
        });
        break;
      }
    }

    return splitResults.map((result) => ({
      user_id: result.userId,
      amount: result.amount,
      share_value: result.shareValue,
    }));
  }

  function onSubmit(formValues: AddExpenseFormValues) {
    if (selectedParticipants.length === 0) {
      toast.error("Please select at least one participant");
      return;
    }

    startTransition(async () => {
      try {
        const splits = buildSplitsPayload(formValues);

        const result = await createExpense({
          expense: {
            group_id: groupId,
            description: formValues.description,
            amount: formValues.amount,
            currency: "INR",
            date: formValues.date,
            paid_by: formValues.paid_by,
            created_by: currentUserId,
            split_type: formValues.split_type,
            category: formValues.category,
            is_recurring: false,
          },
          splits,
        });

        if (result.error) {
          toast.error(result.error.message);
          return;
        }

        toast.success("Expense created successfully!");
        router.push(`/groups/${groupId}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Something went wrong";
        toast.error(message);
      }
    });
  }

  const displayDate = watchedDate
    ? format(new Date(watchedDate + "T00:00:00"), "PPP")
    : "Pick a date";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Expense</CardTitle>
        <CardDescription>
          Record a shared expense for this group.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          {/* Description */}
          <Field>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              type="text"
              placeholder="e.g. Dinner at Olive Garden"
              autoComplete="off"
              aria-invalid={!!errors.description}
              {...register("description")}
            />
            <FieldError>{errors.description?.message}</FieldError>
          </Field>

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
            <FieldError>{errors.amount?.message}</FieldError>
          </Field>

          {/* Date */}
          <Field>
            <Label>Date</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watchedDate && "text-muted-foreground",
                    )}
                  />
                }
              >
                <CalendarIcon className="mr-2 size-4" />
                {displayDate}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={watchedDate ? new Date(watchedDate + "T00:00:00") : undefined}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FieldError>{errors.date?.message}</FieldError>
          </Field>

          {/* Paid By */}
          <Field>
            <Label>Paid by</Label>
            <Select
              value={watchedPaidBy}
              onValueChange={(val) =>
                setValue("paid_by", val as string, { shouldValidate: true })
              }
            >
              <SelectTrigger className="w-full" aria-invalid={!!errors.paid_by}>
                <SelectValue placeholder="Select who paid" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {member.name}
                    {member.userId === currentUserId ? " (you)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.paid_by?.message}</FieldError>
          </Field>

          {/* Category */}
          <Field>
            <Label>Category</Label>
            <Select
              value={watchedCategory}
              onValueChange={(val) =>
                setValue("category", val as ExpenseCategory, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger className="w-full" aria-invalid={!!errors.category}>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {categoryLabels[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.category?.message}</FieldError>
          </Field>

          {/* Split Type */}
          <Field>
            <Label>Split type</Label>
            <RadioGroup
              value={watchedSplitType}
              onValueChange={(val) =>
                handleSplitTypeChange(val as SplitType)
              }
              className="flex flex-wrap gap-3"
            >
              {SPLIT_TYPES.map((type) => (
                <label
                  key={type}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <RadioGroupItem value={type} />
                  <span className="text-sm">{splitTypeLabels[type]}</span>
                </label>
              ))}
            </RadioGroup>
            <FieldError>{errors.split_type?.message}</FieldError>
          </Field>

          {/* Participants */}
          <Field>
            <Label>Participants</Label>
            <div className="flex flex-col gap-2">
              {members.map((member) => {
                const isChecked = selectedParticipants.includes(member.userId);
                return (
                  <div key={member.userId} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <label className="flex cursor-pointer items-center gap-2 flex-1 min-w-0">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            handleParticipantToggle(member.userId, checked)
                          }
                        />
                        <span className="text-sm truncate">
                          {member.name}
                          {member.userId === currentUserId ? " (you)" : ""}
                        </span>
                      </label>
                      {watchedSplitType !== "equal" && isChecked && (
                        <Input
                          type="number"
                          inputMode="decimal"
                          step={watchedSplitType === "shares" ? "1" : "0.01"}
                          min="0"
                          placeholder="0"
                          className="w-28 text-right"
                          value={customSplitValues[member.userId] ?? ""}
                          onChange={(e) =>
                            handleCustomValueChange(
                              member.userId,
                              e.target.value,
                            )
                          }
                          aria-label={`${splitTypeInputLabels[watchedSplitType]} for ${member.name}`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedParticipants.length === 0 && (
              <p className="text-sm text-destructive">
                At least one participant is required
              </p>
            )}
            {/* Validation feedback for custom split values */}
            {splitValidation && watchedSplitType !== "shares" && (
              <p
                className={cn(
                  "text-sm",
                  splitValidation.remaining === 0
                    ? "text-muted-foreground"
                    : "text-destructive",
                )}
              >
                {splitValidation.remaining > 0
                  ? `${splitValidation.remaining} ${splitValidation.unit} remaining`
                  : splitValidation.remaining < 0
                    ? `${Math.abs(splitValidation.remaining)} ${splitValidation.unit} over`
                    : `Splits add up correctly`}
              </p>
            )}
            {splitValidation && watchedSplitType === "shares" && (
              <p className="text-sm text-muted-foreground">
                Total: {splitValidation.total}{" "}
                {splitValidation.total === 1 ? "share" : "shares"}
              </p>
            )}
          </Field>

          {/* Split Preview */}
          {splitPreview.results.length > 0 && (
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="mb-3 text-sm font-semibold">Split Preview</p>
              <div className="flex flex-col gap-2">
                {splitPreview.results.map((result) => {
                  const member = members.find(
                    (m) => m.userId === result.userId,
                  );
                  return (
                    <div
                      key={result.userId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate">
                        {member?.name ?? "Unknown"}
                        {result.userId === currentUserId ? " (you)" : ""}
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatINR(result.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {splitPreview.error && (
            <p className="text-sm text-destructive">{splitPreview.error}</p>
          )}

          <Button type="submit" size="lg" disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            Add Expense
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
