"use client";

import { useState, useTransition } from "react";
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
import { calculateSplit } from "@/lib/algorithms/splits";
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

  const watchedDate = watch("date");
  const watchedPaidBy = watch("paid_by");
  const watchedSplitType = watch("split_type");
  const watchedCategory = watch("category");

  function handleParticipantToggle(userId: string, checked: boolean) {
    setSelectedParticipants((prev) => {
      if (checked) {
        return [...prev, userId];
      }
      return prev.filter((id) => id !== userId);
    });
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

    // Currently only "equal" split is fully supported from the form.
    // Other split types (exact, percentage, shares) require per-participant
    // value inputs that will be added in the live split preview task.
    if (formValues.split_type !== "equal") {
      throw new Error(
        `Split type "${formValues.split_type}" is not yet supported. Please use "equal" for now.`,
      );
    }

    const splitResults = calculateSplit({
      splitType: "equal",
      totalAmount: formValues.amount,
      participants: selectedParticipants,
    });

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
                setValue("split_type", val as SplitType, {
                  shouldValidate: true,
                })
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
                  <label
                    key={member.userId}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleParticipantToggle(member.userId, checked)
                      }
                    />
                    <span className="text-sm">
                      {member.name}
                      {member.userId === currentUserId ? " (you)" : ""}
                    </span>
                  </label>
                );
              })}
            </div>
            {selectedParticipants.length === 0 && (
              <p className="text-sm text-destructive">
                At least one participant is required
              </p>
            )}
          </Field>

          <Button type="submit" size="lg" disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            Add Expense
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
