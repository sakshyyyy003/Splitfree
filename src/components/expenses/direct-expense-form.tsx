"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { format } from "date-fns";
import { CalendarIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import {
  SPLIT_TYPES,
  type SplitType,
} from "@/lib/validators/expense";
import { calculateSplit, type SplitResult } from "@/lib/algorithms/splits";
import { createDirectExpense } from "@/actions/expenses";
import type { ProfileResult } from "@/actions/search";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Field, FieldError } from "@/components/ui/field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { UserSearch } from "@/components/ui/user-search";
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

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  return email[0]?.toUpperCase() ?? "?";
}

/** Per-participant custom values for non-equal split types */
type CustomSplitValues = Record<string, number>;

// -------------------------------------------------------
// Form-level schema (UI fields only)
// -------------------------------------------------------

const directExpenseFormSchema = z.object({
  description: z
    .string()
    .min(1, { error: "Description is required" })
    .max(255, { error: "Description must be 255 characters or fewer" }),
  amount: z
    .number({ error: "Amount must be a number" })
    .positive({ error: "Amount must be greater than zero" })
    .max(9999999999.99, { error: "Amount exceeds maximum allowed value" }),
  date: z.string().min(1, { error: "Date is required" }),
  split_type: z.enum(SPLIT_TYPES, { error: "Invalid split type" }),
  category: z.enum(EXPENSE_CATEGORIES, { error: "Invalid category" }),
  notes: z
    .string()
    .max(5000, { error: "Notes must be 5000 characters or fewer" })
    .optional(),
});

type DirectExpenseFormValues = z.infer<typeof directExpenseFormSchema>;

// -------------------------------------------------------
// Props
// -------------------------------------------------------

type DirectExpenseFormProps = {
  currentUserId: string;
  currentUserName: string;
};

// -------------------------------------------------------
// Component
// -------------------------------------------------------

export function DirectExpenseForm({
  currentUserId,
  currentUserName,
}: DirectExpenseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<ProfileResult | null>(null);
  const [customSplitValues, setCustomSplitValues] = useState<CustomSplitValues>({});

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DirectExpenseFormValues>({
    resolver: zodResolver(directExpenseFormSchema),
    defaultValues: {
      description: "",
      amount: undefined as unknown as number,
      date: format(new Date(), "yyyy-MM-dd"),
      split_type: "equal",
      category: "other",
      notes: "",
    },
  });

  const watchedAmount = watch("amount");
  const watchedDate = watch("date");
  const watchedSplitType = watch("split_type");
  const watchedCategory = watch("category");

  // The two participants are always the current user and the selected friend
  const participants = useMemo<string[]>(() => {
    if (!selectedFriend) return [currentUserId];
    return [currentUserId, selectedFriend.id];
  }, [currentUserId, selectedFriend]);

  // -----------------------------------------------------------
  // Live split preview
  // -----------------------------------------------------------

  const splitPreview = useMemo<{
    results: SplitResult[];
    error: string | null;
  }>(() => {
    const amount = Number(watchedAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { results: [], error: null };
    }

    if (!selectedFriend) {
      return { results: [], error: null };
    }

    try {
      if (watchedSplitType === "equal") {
        return {
          results: calculateSplit({
            splitType: "equal",
            totalAmount: amount,
            participants,
          }),
          error: null,
        };
      }

      if (watchedSplitType === "exact") {
        const assignments = participants.map((userId) => ({
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
        const assignments = participants.map((userId) => ({
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
      const assignments = participants.map((userId) => ({
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
  }, [watchedAmount, watchedSplitType, participants, customSplitValues, selectedFriend]);

  // Validation feedback for non-equal split types
  const splitValidation = useMemo<{
    total: number;
    expected: number;
    remaining: number;
    unit: string;
  } | null>(() => {
    if (watchedSplitType === "equal") return null;
    if (!selectedFriend) return null;

    const total = participants.reduce(
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
  }, [watchedSplitType, watchedAmount, participants, customSplitValues, selectedFriend]);

  function handleFriendSelect(profile: ProfileResult) {
    setSelectedFriend(profile);
    // Reset custom split values when friend changes
    setCustomSplitValues({});
  }

  function handleFriendRemove() {
    setSelectedFriend(null);
    setCustomSplitValues({});
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

  function getDisplayName(userId: string): string {
    if (userId === currentUserId) return `${currentUserName} (you)`;
    return selectedFriend?.name ?? selectedFriend?.email ?? "Friend";
  }

  function buildSplitsPayload(formValues: DirectExpenseFormValues): {
    user_id: string;
    amount: number;
    share_value?: number;
  }[] {
    if (!selectedFriend) {
      throw new Error("Please select a friend");
    }

    let splitResults: SplitResult[];

    switch (formValues.split_type) {
      case "equal": {
        splitResults = calculateSplit({
          splitType: "equal",
          totalAmount: formValues.amount,
          participants,
        });
        break;
      }
      case "exact": {
        splitResults = calculateSplit({
          splitType: "exact",
          totalAmount: formValues.amount,
          participants: participants.map((userId) => ({
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
          participants: participants.map((userId) => ({
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
          participants: participants.map((userId) => ({
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

  function onSubmit(formValues: DirectExpenseFormValues) {
    if (!selectedFriend) {
      toast.error("Please select a friend to split with");
      return;
    }

    startTransition(async () => {
      try {
        const splits = buildSplitsPayload(formValues);

        const result = await createDirectExpense({
          friend_id: selectedFriend.id,
          expense: {
            description: formValues.description,
            amount: formValues.amount,
            currency: "INR",
            date: formValues.date,
            // paid_by and created_by are enforced server-side
            paid_by: currentUserId,
            created_by: currentUserId,
            split_type: formValues.split_type,
            category: formValues.category,
            notes: formValues.notes || undefined,
            is_recurring: false,
          },
          splits,
        });

        if (result.error) {
          toast.error(result.error.message);
          return;
        }

        toast.success("Expense added successfully!");
        router.push("/dashboard");
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
        <CardTitle>Add Direct Expense</CardTitle>
        <CardDescription>
          Record a 1-on-1 expense with a friend, outside of any group.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          {/* Friend selection */}
          <Field>
            <Label>Split with</Label>
            {selectedFriend ? (
              <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <Avatar size="sm">
                  {selectedFriend.avatar_url ? (
                    <AvatarImage
                      src={selectedFriend.avatar_url}
                      alt={selectedFriend.name ?? selectedFriend.email}
                    />
                  ) : null}
                  <AvatarFallback>
                    {getInitials(selectedFriend.name, selectedFriend.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  {selectedFriend.name ? (
                    <p className="truncate text-sm font-semibold">
                      {selectedFriend.name}
                    </p>
                  ) : null}
                  <p className="truncate text-sm text-muted-foreground">
                    {selectedFriend.email}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleFriendRemove}
                  aria-label="Remove selected friend"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <UserSearch
                onSelect={handleFriendSelect}
                excludeUserIds={[currentUserId]}
                placeholder="Search for a friend by name or email..."
              />
            )}
            {!selectedFriend && (
              <p className="text-sm text-muted-foreground">
                Search and select the person you want to split this expense with.
              </p>
            )}
          </Field>

          {/* Description */}
          <Field>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              type="text"
              placeholder="e.g. Coffee at Blue Tokai"
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

          {/* Split Configuration (non-equal only, shown when friend is selected) */}
          {selectedFriend && watchedSplitType !== "equal" && (
            <Field>
              <Label>Split details</Label>
              <div className="flex flex-col gap-3">
                {participants.map((userId) => (
                  <div key={userId} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {getDisplayName(userId)}
                    </span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step={watchedSplitType === "shares" ? "1" : "0.01"}
                      min="0"
                      placeholder="0"
                      className="w-28 text-right"
                      value={customSplitValues[userId] ?? ""}
                      onChange={(e) =>
                        handleCustomValueChange(userId, e.target.value)
                      }
                      aria-label={`${splitTypeInputLabels[watchedSplitType]} for ${getDisplayName(userId)}`}
                    />
                  </div>
                ))}
              </div>
              {/* Validation feedback */}
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
          )}

          {/* Split Preview */}
          {splitPreview.results.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="mb-3 text-sm font-semibold">Split Preview</p>
              <div className="flex flex-col gap-2">
                {splitPreview.results.map((result) => (
                  <div
                    key={result.userId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate">
                      {getDisplayName(result.userId)}
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatINR(result.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {splitPreview.error && (
            <p className="text-sm text-destructive">{splitPreview.error}</p>
          )}

          <Button type="submit" size="lg" disabled={isPending || !selectedFriend}>
            {isPending && <Loader2 className="animate-spin" />}
            Add Expense
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
