import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().optional().default(""),
  // Upstash split form (TCP "Redis" endpoint + password — NOT the REST URL).
  UPSTASH_REDIS_URL: z.string().optional().default(""),
  UPSTASH_REDIS_TOKEN: z.string().optional().default(""),
  // Accepted but unused by queues: BullMQ needs the native Redis protocol,
  // which the Upstash REST API does not speak.
  UPSTASH_REDIS_REST_URL: z.string().optional().default(""),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(""),
  GROQ_API_KEY: z.string().optional().default(""),
  GROQ_API_URL: z.string().default("https://api.groq.com/openai/v1"),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
  // Deprecated xAI Grok vars — still accepted as a fallback by GroqService.
  GROK_API_KEY: z.string().optional().default(""),
  GROK_API_URL: z.string().optional().default(""),
  GROK_MODEL: z.string().optional().default(""),
  EVOLUTION_API_URL: z.string().default("http://localhost:8080"),
  EVOLUTION_API_KEY: z.string().optional().default(""),
  EVOLUTION_INSTANCE: z.string().default("business-01"),
  NEXTAUTH_URL: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  APP_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** Validate process.env server-side. Throws on missing required vars. */
export function getEnv(): Env {
  if (cached) return cached;
  cached = envSchema.parse(process.env);
  return cached;
}

/** Non-throwing check used at boot to warn about missing optional integrations. */
export function checkIntegrations() {
  const env = process.env;
  return {
    groq: Boolean(env.GROQ_API_KEY ?? env.GROK_API_KEY),
    evolution: Boolean(env.EVOLUTION_API_URL && env.EVOLUTION_API_KEY),
    redis: Boolean(env.REDIS_URL || env.UPSTASH_REDIS_URL),
  };
}
