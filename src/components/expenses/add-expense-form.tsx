"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { format } from "date-fns";
import { CalendarIcon, Loader2, X, Users } from "lucide-react";
import { toast } from "sonner";

import {
  SPLIT_TYPES,
  type SplitType,
} from "@/lib/validators/expense";
import { calculateSplit, type SplitResult } from "@/lib/algorithms/splits";
import { createExpense, createDirectExpense } from "@/actions/expenses";
import { fetchFrequentContacts, fetchGroupMembers, type GroupMemberResult } from "@/actions/search";
import type { ProfileResult, GroupResult } from "@/actions/search";
import type { GroupMember } from "@/types/group-detail";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  food: { label: "Food", emoji: "\uD83C\uDF7D\uFE0F" },
  transport: { label: "Travel", emoji: "\uD83D\uDE97" },
  accommodation: { label: "Stay", emoji: "\uD83C\uDFE0" },
  entertainment: { label: "Fun", emoji: "\uD83C\uDFAD" },
  utilities: { label: "Bills", emoji: "\u26A1" },
  shopping: { label: "Shopping", emoji: "\uD83D\uDED2" },
  other: { label: "Other", emoji: "\u25CF" },
};

const splitTypeConfig: Record<SplitType, { symbol: string; label: string }> = {
  equal: { symbol: "=", label: "EQUAL" },
  exact: { symbol: "\u20B9", label: "EXACT" },
  percentage: { symbol: "%", label: "PERCENT" },
  shares: { symbol: "#", label: "SHARES" },
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

function getInitials(name: string | null, fallback?: string): string {
  const source = name ?? fallback ?? "?";
  return source
    .split(" ")
    .map((part) => part[0] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type CustomSplitValues = Record<string, number>;

// -------------------------------------------------------
// Form schema
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
  paid_by: z.string().min(1, { error: "Please select who paid" }),
  split_type: z.enum(SPLIT_TYPES, { error: "Invalid split type" }),
  category: z.enum(EXPENSE_CATEGORIES, { error: "Invalid category" }),
});

type AddExpenseFormValues = z.infer<typeof addExpenseFormSchema>;

// -------------------------------------------------------
// Selection type — what user picked in "Split with"
// -------------------------------------------------------

type Selection =
  | { type: "group"; group: GroupResult; members: GroupMember[] }
  | { type: "person"; person: ProfileResult };

// -------------------------------------------------------
// Props
// -------------------------------------------------------

type AddExpenseFormProps = {
  currentUserId: string;
  currentUserName: string;
  /** Pre-selected group context (from group detail page) */
  groupId?: string;
  /** Pre-fetched members (from group detail page) */
  members?: GroupMember[];
};

// -------------------------------------------------------
// Component
// -------------------------------------------------------

export function AddExpenseForm({
  currentUserId,
  currentUserName,
  groupId: preSelectedGroupId,
  members: preSelectedMembers,
}: AddExpenseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isFetchingMembers, startFetchingMembers] = useTransition();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<ProfileResult[]>([]);

  useEffect(() => {
    fetchFrequentContacts([currentUserId]).then((result) => {
      if (result.data) setSuggestions(result.data);
    });
  }, [currentUserId]);

  // For group context from props, pre-populate selection
  const isGroupContext = !!(preSelectedGroupId && preSelectedMembers);

  const [selection, setSelection] = useState<Selection | null>(() => {
    if (isGroupContext) {
      return {
        type: "group",
        group: { id: preSelectedGroupId!, name: "", category: "" } as GroupResult,
        members: preSelectedMembers!,
      };
    }
    return null;
  });

  // Participants — all members selected by default for groups
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    () => {
      if (preSelectedMembers) {
        return preSelectedMembers.map((m) => m.userId);
      }
      return [currentUserId];
    },
  );

  const [customSplitValues, setCustomSplitValues] = useState<CustomSplitValues>({});

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

  // Derive participants list for split calculations
  const participantIds = useMemo<string[]>(() => {
    if (!selection) return [currentUserId];

    if (selection.type === "person") {
      return [currentUserId, selection.person.id];
    }

    // Group — use selected participants (checkboxes)
    return selectedParticipants;
  }, [selection, currentUserId, selectedParticipants]);

  // Members list for rendering (group context)
  const membersList = useMemo<GroupMember[]>(() => {
    if (selection?.type === "group") return selection.members;
    return [];
  }, [selection]);

  // "Paid by" options
  const paidByOptions = useMemo<{ id: string; label: string }[]>(() => {
    if (selection?.type === "group") {
      return selection.members.map((m) => ({
        id: m.userId,
        label: m.userId === currentUserId ? `${m.name} (you)` : m.name,
      }));
    }

    if (selection?.type === "person") {
      return [
        { id: currentUserId, label: `${currentUserName} (you)` },
        {
          id: selection.person.id,
          label: selection.person.name ?? selection.person.email,
        },
      ];
    }

    return [{ id: currentUserId, label: `${currentUserName} (you)` }];
  }, [selection, currentUserId, currentUserName]);

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

    if (participantIds.length === 0) {
      return { results: [], error: "No participants selected" };
    }

    if (!selection) {
      return { results: [], error: null };
    }

    try {
      if (watchedSplitType === "equal") {
        return {
          results: calculateSplit({
            splitType: "equal",
            totalAmount: amount,
            participants: participantIds,
          }),
          error: null,
        };
      }

      if (watchedSplitType === "exact") {
        const assignments = participantIds.map((userId) => ({
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
        const assignments = participantIds.map((userId) => ({
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
      const assignments = participantIds.map((userId) => ({
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
  }, [watchedAmount, watchedSplitType, participantIds, customSplitValues, selection]);

  const splitValidation = useMemo<{
    total: number;
    expected: number;
    remaining: number;
    unit: string;
  } | null>(() => {
    if (watchedSplitType === "equal") return null;

    const total = participantIds.reduce(
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

    return {
      total,
      expected: 0,
      remaining: 0,
      unit: "shares",
    };
  }, [watchedSplitType, watchedAmount, participantIds, customSplitValues]);

  // -----------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------

  function handleGroupSelect(group: GroupResult) {
    startFetchingMembers(async () => {
      const result = await fetchGroupMembers(group.id);
      if (result.error || !result.data) {
        toast.error(result.error?.message ?? "Failed to fetch group members");
        return;
      }

      const members: GroupMember[] = result.data.map((m) => ({
        userId: m.id,
        name: m.name,
        email: m.email,
        avatarUrl: m.avatar_url,
        role: "member" as const,
        joinedAt: "",
      }));

      setSelection({ type: "group", group, members });
      setSelectedParticipants(members.map((m) => m.userId));
      setCustomSplitValues({});
      // Reset paid_by to current user
      setValue("paid_by", currentUserId, { shouldValidate: true });
    });
  }

  function handlePersonSelect(person: ProfileResult) {
    setSelection({ type: "person", person });
    setCustomSplitValues({});
    setValue("paid_by", currentUserId, { shouldValidate: true });
  }

  function handleClearSelection() {
    setSelection(null);
    setSelectedParticipants([currentUserId]);
    setCustomSplitValues({});
    setValue("paid_by", currentUserId, { shouldValidate: true });
  }

  function handleParticipantToggle(userId: string, checked: boolean) {
    setSelectedParticipants((prev) => {
      if (checked) return [...prev, userId];
      return prev.filter((id) => id !== userId);
    });
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
    setCustomSplitValues({});
  }

  function handleDateSelect(date: Date | undefined) {
    if (!date) return;
    setValue("date", format(date, "yyyy-MM-dd"), { shouldValidate: true });
    setDatePickerOpen(false);
  }

  function getDisplayName(userId: string): string {
    if (userId === currentUserId) return `${currentUserName} (you)`;
    if (selection?.type === "person") {
      return selection.person.name ?? selection.person.email;
    }
    if (selection?.type === "group") {
      const member = selection.members.find((m) => m.userId === userId);
      return member?.name ?? "Unknown";
    }
    return "Unknown";
  }

  function buildSplitsPayload(formValues: AddExpenseFormValues) {
    let splitResults: SplitResult[];

    switch (formValues.split_type) {
      case "equal": {
        splitResults = calculateSplit({
          splitType: "equal",
          totalAmount: formValues.amount,
          participants: participantIds,
        });
        break;
      }
      case "exact": {
        splitResults = calculateSplit({
          splitType: "exact",
          totalAmount: formValues.amount,
          participants: participantIds.map((userId) => ({
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
          participants: participantIds.map((userId) => ({
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
          participants: participantIds.map((userId) => ({
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
    if (!selection) {
      toast.error("Please select a group or person to split with");
      return;
    }

    if (selection.type === "group" && selectedParticipants.length === 0) {
      toast.error("Please select at least one participant");
      return;
    }

    startTransition(async () => {
      try {
        const splits = buildSplitsPayload(formValues);

        if (selection.type === "group") {
          const groupId = preSelectedGroupId ?? selection.group.id;
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
          return;
        }

        // Person — direct expense
        const result = await createDirectExpense({
          friend_id: selection.person.id,
          expense: {
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

  const avatarColors = [
    "bg-black text-white",
    "bg-hotgreen text-black",
    "bg-highlight text-black",
    "bg-gray-500 text-white",
  ];

  const categoryEmoji: Record<string, string> = {
    trip: "\u2708\uFE0F",
    home: "\uD83C\uDFE0",
    couple: "\u2764\uFE0F",
    work: "\uD83D\uDCBC",
    friends: "\uD83C\uDF89",
    other: "\uD83C\uDF00",
  };

  return (
    <div className="rounded-xl bg-white p-6 sm:p-8">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
        {/* Big Amount Input */}
        <div className="mb-8 text-center">
          <label className="mb-3 block text-xs font-bold uppercase tracking-ultra text-textsec">
            Amount
          </label>
          <div className="flex items-center justify-center gap-2">
            <span className="text-4xl font-bold text-textsec">{"\u20B9"}</span>
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
              onWheel={(e) => e.currentTarget.blur()}
              {...register("amount", { valueAsNumber: true })}
            />
          </div>
          <div className="mx-auto mt-2 h-1 w-32 bg-hotgreen" />
          <FieldError>{errors.amount?.message}</FieldError>
        </div>

        {/* Split with — only shown when no pre-selected group */}
        {!isGroupContext && (
          <div className="mb-6">
            <label className="mb-3 block text-xs font-bold uppercase tracking-ultra text-textsec">
              Split with
            </label>
            {selection ? (
              <div className="flex items-center gap-3 rounded-lg border-2 border-hotgreen bg-hotgreen/5 p-3">
                {selection.type === "group" ? (
                  <>
                    <div className="flex size-8 items-center justify-center rounded-full bg-secondary">
                      <Users className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">
                        {categoryEmoji[selection.group.category] ?? "\uD83D\uDCCB"}{" "}
                        {selection.group.name}
                      </p>
                      <p className="truncate text-xs text-textsec">
                        Group &middot; {selection.members.length} members
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Avatar size="sm">
                      {selection.person.avatar_url ? (
                        <AvatarImage
                          src={selection.person.avatar_url}
                          alt={selection.person.name ?? selection.person.email}
                        />
                      ) : null}
                      <AvatarFallback>
                        {getInitials(selection.person.name, selection.person.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      {selection.person.name ? (
                        <p className="truncate text-sm font-bold">
                          {selection.person.name}
                        </p>
                      ) : null}
                      <p className="truncate text-sm text-textsec">
                        {selection.person.email}
                      </p>
                    </div>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleClearSelection}
                  aria-label="Clear selection"
                  className="rounded-lg p-1 transition-colors hover:bg-black/5"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <UserSearch
                onSelect={handlePersonSelect}
                onGroupSelect={handleGroupSelect}
                excludeUserIds={[currentUserId]}
                placeholder="Search for a group or person"
                showGroups
                suggestions={suggestions}
              />
            )}
            {isFetchingMembers && (
              <div className="mt-2 flex items-center gap-2 text-xs text-textsec">
                <Loader2 className="size-3 animate-spin" />
                Loading group members...
              </div>
            )}
          </div>
        )}

        {/* Expense */}
        <div className="mb-6">
          <label className="mb-3 block text-xs font-bold uppercase tracking-ultra text-textsec">
            Expense
          </label>
          <input
            type="text"
            placeholder="e.g. Dinner at Toit"
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

        {/* Paid By */}
        <div className="mb-6">
          <label className="mb-3 block text-xs font-bold uppercase tracking-ultra text-textsec">
            Paid by
          </label>
          <Select
            value={watchedPaidBy}
            onValueChange={(val) =>
              setValue("paid_by", val as string, { shouldValidate: true })
            }
          >
            <SelectTrigger className="w-full" aria-invalid={!!errors.paid_by}>
              <SelectValue placeholder="Select who paid">
                {(value: string) => {
                  const match = paidByOptions.find((o) => o.id === value);
                  return match?.label ?? "Select who paid";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {paidByOptions.map((option) => (
                <SelectItem key={option.id} value={option.id} label={option.label}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError>{errors.paid_by?.message}</FieldError>
        </div>

        {/* Split Type Cards */}
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

        {/* Participants — shown for group selection */}
        {selection?.type === "group" && (
          <div className="mb-6">
            <label className="mb-3 block text-xs font-bold uppercase tracking-ultra text-textsec">
              Participants
            </label>
            <div className="flex flex-col gap-2">
              {membersList.map((member) => {
                const isChecked = selectedParticipants.includes(member.userId);
                return (
                  <div key={member.userId} className="flex items-center gap-2">
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          handleParticipantToggle(member.userId, checked)
                        }
                      />
                      <span className="truncate text-sm font-bold">
                        {member.name}
                        {member.userId === currentUserId ? " (you)" : ""}
                      </span>
                    </label>
                    {watchedSplitType !== "equal" && isChecked && (
                      <input
                        type="number"
                        inputMode="decimal"
                        step={watchedSplitType === "shares" ? "1" : "0.01"}
                        min="0"
                        placeholder="0"
                        className="w-28 rounded-lg border-2 border-gray-300 bg-transparent px-3 py-2 text-right text-sm font-bold transition-colors focus:border-hotgreen focus:outline-none"
                        value={customSplitValues[member.userId] ?? ""}
                        onWheel={(e) => e.currentTarget.blur()}
                        onChange={(e) =>
                          handleCustomValueChange(member.userId, e.target.value)
                        }
                        aria-label={`${splitTypeInputLabels[watchedSplitType]} for ${member.name}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {selectedParticipants.length === 0 && (
              <p className="mt-1 text-sm text-destructive">
                At least one participant is required
              </p>
            )}
            {splitValidation && watchedSplitType !== "shares" && (
              <p
                className={cn(
                  "mt-1 text-sm",
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
              <p className="mt-1 text-sm text-muted-foreground">
                Total: {splitValidation.total}{" "}
                {splitValidation.total === 1 ? "share" : "shares"}
              </p>
            )}
          </div>
        )}

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

        {/* Split Details — person mode, non-equal only */}
        {selection?.type === "person" && watchedSplitType !== "equal" && (
          <div className="mb-6">
            <label className="mb-3 block text-xs font-bold uppercase tracking-ultra text-textsec">
              Split Details
            </label>
            <div className="flex flex-col gap-3">
              {participantIds.map((userId) => (
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
                    onWheel={(e) => e.currentTarget.blur()}
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
                        {getInitials(displayName)}
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
          disabled={isPending || !selection}
          className="w-full border-0 bg-black py-5 text-lg text-white hover:bg-gray-900"
        >
          {isPending && <Loader2 className="animate-spin" />}
          ADD EXPENSE
        </Button>
      </form>
    </div>
  );
}
