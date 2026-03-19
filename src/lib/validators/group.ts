import { z } from "zod/v4";

const MAX_COVER_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_COVER_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const GROUP_CATEGORIES = ["trip", "home", "couple", "other"] as const;
export type GroupCategory = (typeof GROUP_CATEGORIES)[number];

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, { error: "Group name is required" })
    .max(100, { error: "Group name must be 100 characters or fewer" }),
  category: z.enum(GROUP_CATEGORIES, {
    error: "Please select a category",
  }),
});

export const coverImageSchema = z
  .file()
  .mime(ACCEPTED_COVER_MIME_TYPES, {
    error: "Cover image must be a JPEG, PNG, or WebP image",
  })
  .max(MAX_COVER_SIZE_BYTES, {
    error: "Cover image must be smaller than 5 MB",
  });

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
