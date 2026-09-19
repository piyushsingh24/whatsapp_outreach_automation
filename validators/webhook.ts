import { z } from "zod";

/** Evolution API webhook payload — permissive, validated then normalized by handler. */
export const evolutionWebhookSchema = z.object({
  event: z.string().min(1),
  instance: z.string().optional(),
  data: z.unknown().optional(),
  // Evolution v2 sometimes nests differently:
  // allow passthrough of extra keys
}).passthrough();

export type EvolutionWebhook = z.infer<typeof evolutionWebhookSchema>;

export const whatsappConnectSchema = z.object({
  name: z.string().trim().min(1).max(100).default("business-01"),
  phone: z.string().max(20).optional(),
});
