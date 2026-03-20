import { z } from "zod/v4";

export const addMemberSchema = z.object({
  groupId: z.uuid({ error: "Invalid group ID" }),
  userId: z.uuid({ error: "Invalid user ID" }),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const removeMemberSchema = z.object({
  groupId: z.uuid({ error: "Invalid group ID" }),
  userId: z.uuid({ error: "Invalid user ID" }),
});

export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
