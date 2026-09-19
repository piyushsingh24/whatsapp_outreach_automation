import { z } from "zod";

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1, "Campaign name is required").max(200),
  description: z.string().max(2000).optional().default(""),
  objective: z.string().trim().min(1, "Objective is required").max(2000),
  tone: z.string().trim().min(1).max(200).default("Professional and friendly"),
  language: z.string().trim().min(1).max(50).default("English"),
  cta: z.string().trim().min(1, "CTA is required").max(1000),
  contactIds: z.array(z.string().min(1)).min(1, "Select at least one contact").max(5000),
  messagesPerBatch: z.coerce.number().int().min(1).max(100).default(20),
  delayBetweenMs: z.coerce.number().int().min(0).max(60000).default(2000),
  maxMessages: z.coerce.number().int().min(1).max(10000).default(1000),
  maxRetries: z.coerce.number().int().min(0).max(10).default(3),
});

export const updateCampaignSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  objective: z.string().trim().min(1).max(2000).optional(),
  tone: z.string().trim().min(1).max(200).optional(),
  language: z.string().trim().min(1).max(50).optional(),
  cta: z.string().trim().min(1).max(1000).optional(),
  messagesPerBatch: z.coerce.number().int().min(1).max(100).optional(),
  delayBetweenMs: z.coerce.number().int().min(0).max(60000).optional(),
  maxMessages: z.coerce.number().int().min(1).max(10000).optional(),
  maxRetries: z.coerce.number().int().min(0).max(10).optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
