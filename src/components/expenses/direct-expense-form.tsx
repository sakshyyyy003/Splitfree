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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FieldError } from "@/components/ui/field";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const categoryConfig: Record<ExpenseCategory, { label: string; emoji: string }> = {
  food: { label: "Food", emoji: "🍽️" },
  transport: { label: "Travel", emoji: "🚗" },
  accommodation: { label: "Stay", emoji: "🏠" },
  entertainment: { label: "Fun", emoji: "🎭" },
  utilities: { label: "Bills", emoji: "⚡" },
  shopping: { label: "Shopping", emoji: "🛒" },
  other: { label: "Other", emoji: "●" },
};

const splitTypeConfig: Record<SplitType, { symbol: string; label: string }> = {
  equal: { symbol: "=", label: "EQUAL" },
  exact: { symbol: "₹", label: "EXACT" },
  percentage: { symbol: "%", label: "PERCENT" },
  shares: { symbol: "#", label: "SHARES" },
};

const splitTypeInputLabels: Record<SplitType, string> = {
  equal: "",
  exact: "Amount (INR)",
  percentage: "Percentage (%)",
  shares: "Shares",
};

const avatarColors = ["bg-black text-white", "bg-hotgreen text-black", "bg-highlight text-black", "bg-gray-500 text-white"];

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
    share_value: number | null;
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
    <div className="rounded-xl bg-white p-6 sm:p-8">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col"
      >
        {/* Big Amount Input */}
        <div className="mb-8 text-center">
          <label className="mb-3 block text-xs font-bold uppercase tracking-ultra text-textsec">
            Amount
          </label>
          <div className="flex items-center justify-center gap-2">
            <span className="text-4xl font-bold text-textsec">₹</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              placeholder="0"
              autoComplete="off"
              aria-invalid={!!errors.amount}
              className="min-w-[1ch] bg-transparent text-center font-bold focus:outline-none [appearance:textfield] [field-sizing:content] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              style={{ fontSize: "72px", lineHeight: 1 }}
              {...register("amount", { valueAsNumber: true })}
            />
          </div>
          <div className="mx-auto mt-2 h-1 w-32 bg-hotgreen" />
          <FieldError>{errors.amount?.message}</FieldError>
        </div>

        {/* Split with */}
        <div className="mb-6">
          <label className="mb-3 block text-xs font-bold uppercase tracking-ultra text-textsec">
            Split with
          </label>
          {selectedFriend ? (
            <div className="flex items-center gap-3 rounded-lg border-2 border-hotgreen bg-hotgreen/5 p-3">
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
                  <p className="truncate text-sm font-bold">
                    {selectedFriend.name}
                  </p>
                ) : null}
                <p className="truncate text-sm text-textsec">
                  {selectedFriend.email}
                </p>
              </div>
              <button
                type="button"
                onClick={handleFriendRemove}
                aria-label="Remove selected friend"
                className="rounded-lg p-1 transition-colors hover:bg-black/5"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <UserSearch
              onSelect={handleFriendSelect}
              excludeUserIds={[currentUserId]}
              placeholder="Search for a friend by name or email..."
            />
          )}
          {!selectedFriend && (
            <p className="mt-2 text-xs text-textsec">
              Search and select the person you want to split this expense with.
            </p>
          )}
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="mb-3 block text-xs font-bold uppercase tracking-ultra text-textsec">
            Description
          </label>
          <input
            type="text"
            placeholder="e.g. Coffee at Blue Tokai"
            autoComplete="off"
            aria-invalid={!!errors.description}
            className={cn(
              "w-full rounded-lg border-2 border-gray-300 bg-transparent px-4 py-4 text-lg font-bold transition-colors focus:border-hotgreen focus:outline-none",
              errors.description && "border-destructive",
            )}
            {...register("description")}
          />
          <FieldError>{errors.description?.message}</FieldError>
        </div>

        {/* Date */}
        <div className="mb-6">
          <label className="mb-3 block text-xs font-bold uppercase tracking-ultra text-textsec">
            Date
          </label>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border-2 border-gray-300 bg-transparent px-4 py-4 text-left text-sm font-bold transition-colors hover:border-hotgreen",
                    !watchedDate && "text-muted-foreground",
                  )}
                />
              }
            >
              <CalendarIcon className="size-4" />
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
        </div>

        {/* Split Type */}
        <div className="mb-6">
          <label className="mb-3 block text-xs font-bold uppercase tracking-ultra text-textsec">
            Split Type
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SPLIT_TYPES.map((type) => {
              const config = splitTypeConfig[type];
              const isSelected = watchedSplitType === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSplitTypeChange(type)}
                  className={cn(
                    "rounded-lg p-4 text-center transition-colors",
                    isSelected
                      ? "border-2 border-hotgreen bg-hotgreen/10"
                      : "border-2 border-gray-200 hover:border-hotgreen",
                  )}
                >
                  <div className="mb-1 text-xl font-bold">{config.symbol}</div>
                  <div className="text-xs font-bold uppercase tracking-ultra">
                    {config.label}
                  </div>
                </button>
              );
            })}
          </div>
          <FieldError>{errors.split_type?.message}</FieldError>
        </div>

        {/* Category Chips */}
        <div className="mb-6">
          <label className="mb-3 block text-xs font-bold uppercase tracking-ultra text-textsec">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {EXPENSE_CATEGORIES.map((cat) => {
              const config = categoryConfig[cat];
              const isSelected = watchedCategory === cat;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() =>
                    setValue("category", cat, { shouldValidate: true })
                  }
                  className={cn(
                    "rounded-lg px-4 py-2 text-xs font-bold transition-colors",
                    isSelected
                      ? "bg-black text-white"
                      : "border border-gray-300 text-textsec hover:border-black",
                  )}
                >
                  {config.emoji} {config.label}
                </button>
              );
            })}
          </div>
          <FieldError>{errors.category?.message}</FieldError>
        </div>

        {/* Split Configuration (non-equal only, shown when friend is selected) */}
        {selectedFriend && watchedSplitType !== "equal" && (
          <div className="mb-6">
            <label className="mb-3 block text-xs font-bold uppercase tracking-ultra text-textsec">
              Split Details
            </label>
            <div className="flex flex-col gap-3">
              {participants.map((userId) => (
                <div key={userId} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">
                    {getDisplayName(userId)}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step={watchedSplitType === "shares" ? "1" : "0.01"}
                    min="0"
                    placeholder="0"
                    className="w-28 rounded-lg border-2 border-gray-300 bg-transparent px-3 py-2 text-right text-sm font-bold transition-colors focus:border-hotgreen focus:outline-none"
                    value={customSplitValues[userId] ?? ""}
                    onChange={(e) =>
                      handleCustomValueChange(userId, e.target.value)
                    }
                    aria-label={`${splitTypeInputLabels[watchedSplitType]} for ${getDisplayName(userId)}`}
                  />
                </div>
              ))}
            </div>
            {splitValidation && watchedSplitType !== "shares" && (
              <p
                className={cn(
                  "mt-2 text-sm",
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
              <p className="mt-2 text-sm text-muted-foreground">
                Total: {splitValidation.total}{" "}
                {splitValidation.total === 1 ? "share" : "shares"}
              </p>
            )}
          </div>
        )}

        {/* Split Preview */}
        {splitPreview.results.length > 0 && (
          <div className="mb-8 rounded-lg border border-gray-200 bg-background p-5">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-ultra text-textsec">
              Split Preview
            </h4>
            <div className="space-y-3">
              {splitPreview.results.map((result, index) => {
                const displayName = getDisplayName(result.userId);
                const initials =
                  result.userId === currentUserId
                    ? currentUserName
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : getInitials(selectedFriend?.name ?? null, selectedFriend?.email ?? "");
                return (
                  <div
                    key={result.userId}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full text-xs font-bold",
                          avatarColors[index % avatarColors.length],
                        )}
                      >
                        {initials}
                      </div>
                      <span className="text-sm font-bold">{displayName}</span>
                    </div>
                    <span className="font-bold tabular-nums">
                      {formatINR(result.amount)}
                    </span>
                  </div>
                );
              })}
              <div className="mt-3 flex items-center justify-between border-t-2 border-black pt-3">
                <span className="font-bold">Total</span>
                <span className="text-lg font-bold">
                  {formatINR(Number(watchedAmount) || 0)}
                </span>
              </div>
            </div>
          </div>
        )}
        {splitPreview.error && (
          <p className="mb-6 text-sm text-destructive">{splitPreview.error}</p>
        )}

        {/* Submit */}
        <Button
          type="submit"
          size="lg"
          disabled={isPending || !selectedFriend}
          className="w-full border-0 bg-black py-5 text-lg text-white hover:bg-gray-900"
        >
          {isPending && <Loader2 className="animate-spin" />}
          ADD EXPENSE
        </Button>
      </form>
    </div>
  );
}
