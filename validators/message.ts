import { z } from "zod";

export const updateMessageSchema = z.object({
  finalBody: z.string().trim().min(1, "Message body is required").max(4000).optional(),
  status: z.enum(["APPROVED", "REJECTED", "GENERATED"]).optional(),
});

export const messageQuerySchema = z.object({
  status: z.string().max(50).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const aiMessageOutputSchema = z.object({
  message: z.string().trim().min(10).max(2000),
});

export type AiMessageOutput = z.infer<typeof aiMessageOutputSchema>;
