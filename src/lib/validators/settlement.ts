import { z } from "zod/v4";

// -------------------------------------------------------
// Settlement input schema
// -------------------------------------------------------

export const settlementSchema = z
  .object({
    group_id: z.uuid({ error: "Invalid group ID" }),
    paid_by: z.uuid({ error: "Invalid paid_by user ID" }),
    paid_to: z.uuid({ error: "Invalid paid_to user ID" }),
    amount: z
      .number()
      .positive({ error: "Amount must be greater than zero" })
      .max(9999999999.99, { error: "Amount exceeds maximum allowed value" }),
    notes: z
      .string()
      .max(5000, { error: "Notes must be 5000 characters or fewer" })
      .optional(),
  })
  .refine((data) => data.paid_by !== data.paid_to, {
    error: "Payer and recipient must be different people",
    path: ["paid_to"],
  });

// -------------------------------------------------------
// Inferred types
// -------------------------------------------------------

export type SettlementInput = z.infer<typeof settlementSchema>;
