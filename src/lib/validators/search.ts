import { z } from "zod/v4";

export const searchProfilesSchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, { error: "Search query must be at least 2 characters" })
    .max(100, { error: "Search query must be 100 characters or fewer" }),
});

export type SearchProfilesInput = z.infer<typeof searchProfilesSchema>;
