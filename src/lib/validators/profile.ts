import { z } from "zod/v4";

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, { error: "Name is required" })
    .max(100, { error: "Name must be 100 characters or fewer" }),
  description: z
    .string()
    .max(500, { error: "Description must be 500 characters or fewer" })
    .optional(),
});

export const avatarFileSchema = z
  .file()
  .mime(ACCEPTED_AVATAR_MIME_TYPES, {
    error: "Avatar must be a JPEG, PNG, or WebP image",
  })
  .max(MAX_AVATAR_SIZE_BYTES, {
    error: "Avatar must be smaller than 2 MB",
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
