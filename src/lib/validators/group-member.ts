import { z } from "zod/v4";

export const addMemberSchema = z.object({
  groupId: z.uuid({ error: "Invalid group ID" }),
  userId: z.uuid({ error: "Invalid user ID" }),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;
