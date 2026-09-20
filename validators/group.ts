import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(80),
  color: z.string().trim().max(20).optional(),
});

export const updateGroupSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  color: z.string().trim().max(20).optional().nullable(),
});

export const groupMembersSchema = z.object({
  contactIds: z.array(z.string().min(1)).min(1).max(500),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
