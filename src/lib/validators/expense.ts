import { z } from "zod/v4";

// -------------------------------------------------------
// Constants — aligned with DB column constraints
// -------------------------------------------------------

const SPLIT_TYPES = ["equal", "exact", "percentage", "shares"] as const;

const CATEGORIES = [
  "food",
  "transport",
  "accommodation",
  "entertainment",
  "utilities",
  "shopping",
  "other",
] as const;

// -------------------------------------------------------
// Expense input schema
// -------------------------------------------------------

export const expenseSchema = z.object({
  group_id: z.uuid({ error: "Invalid group ID" }).optional(),
  description: z
    .string()
    .min(1, { error: "Description is required" })
    .max(255, { error: "Description must be 255 characters or fewer" }),
  amount: z
    .number()
    .positive({ error: "Amount must be greater than zero" })
    .max(9999999999.99, { error: "Amount exceeds maximum allowed value" }),
  currency: z
    .string()
    .length(3, { error: "Currency must be a 3-letter code" })
    .default("INR"),
  date: z.iso.date({ error: "Date must be a valid YYYY-MM-DD string" }).optional(),
  paid_by: z.uuid({ error: "Invalid paid_by user ID" }),
  created_by: z.uuid({ error: "Invalid created_by user ID" }),
  split_type: z.enum(SPLIT_TYPES, { error: "Invalid split type" }).default("equal"),
  category: z.enum(CATEGORIES, { error: "Invalid category" }).default("other"),
  notes: z
    .string()
    .max(5000, { error: "Notes must be 5000 characters or fewer" })
    .optional(),
  image_url: z
    .url({ error: "Image URL must be a valid URL" })
    .max(500, { error: "Image URL must be 500 characters or fewer" })
    .optional(),
  is_recurring: z.boolean().default(false),
  recurrence_rule: z
    .string()
    .max(50, { error: "Recurrence rule must be 50 characters or fewer" })
    .optional(),
});

// -------------------------------------------------------
// Single split schema
// -------------------------------------------------------

export const splitSchema = z.object({
  user_id: z.uuid({ error: "Invalid split user ID" }),
  amount: z
    .number()
    .min(0, { error: "Split amount must be zero or greater" })
    .max(9999999999.99, { error: "Split amount exceeds maximum allowed value" }),
  share_value: z
    .number()
    .min(0, { error: "Share value must be zero or greater" })
    .optional(),
});

// -------------------------------------------------------
// Combined schema — expense + splits with sum validation
// -------------------------------------------------------

export const createExpenseWithSplitsSchema = z
  .object({
    expense: expenseSchema,
    splits: z
      .array(splitSchema)
      .min(1, { error: "At least one split is required" }),
  })
  .refine(
    (data) => {
      const splitsSum = data.splits.reduce((sum, split) => sum + split.amount, 0);
      // Round to 2 decimal places to avoid floating-point drift
      const roundedSplitsSum = Math.round(splitsSum * 100) / 100;
      const roundedExpenseAmount = Math.round(data.expense.amount * 100) / 100;
      return roundedSplitsSum === roundedExpenseAmount;
    },
    {
      error: "Split amounts must sum to the expense amount",
      path: ["splits"],
    },
  );

// -------------------------------------------------------
// Inferred types
// -------------------------------------------------------

export type ExpenseInput = z.infer<typeof expenseSchema>;
export type SplitInput = z.infer<typeof splitSchema>;
export type CreateExpenseWithSplitsInput = z.infer<
  typeof createExpenseWithSplitsSchema
>;
