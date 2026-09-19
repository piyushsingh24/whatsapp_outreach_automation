import { z } from "zod";

export const phoneSchema = z
  .string()
  .transform((s) => s.replace(/[\s\-()+]/g, ""))
  .pipe(
    z
      .string()
      .regex(/^\d{10,15}$/, "Phone must contain 10–15 digits")
  );

export const contactRowSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  businessName: z.string().trim().min(1, "Business Name is required").max(200),
  phone: phoneSchema,
  businessWork: z.string().trim().min(1, "Business Work is required").max(200),
});

export type ContactRow = z.infer<typeof contactRowSchema>;

export const importContactsSchema = z.object({
  contacts: z.array(contactRowSchema).min(1).max(5000),
  fileName: z.string().max(255).optional(),
});

export const updateContactSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  businessName: z.string().trim().min(1).max(200).optional(),
  phone: phoneSchema.optional(),
  businessWork: z.string().trim().min(1).max(200).optional(),
  status: z
    .enum(["READY", "OPTED_IN", "OPTED_OUT", "BLOCKED", "INVALID", "PROCESSING", "CONTACTED", "RESPONDED"])
    .optional(),
});

export const contactQuerySchema = z.object({
  search: z.string().max(200).optional(),
  status: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
