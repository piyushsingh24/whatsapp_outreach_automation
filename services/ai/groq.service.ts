import { buildPrompt, type AIProvider } from "@/services/ai/ai.service";
import type { GenerateMessageInput } from "@/types";
import { aiMessageOutputSchema } from "@/validators/message";
import { logger } from "@/lib/logger";

const DEFAULT_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const TIMEOUT_MS = 30_000;

/**
 * Groq implementation (OpenAI-compatible chat completions).
 * Endpoint: POST {GROQ_API_URL}/chat/completions with Bearer {GROQ_API_KEY}.
 * Legacy GROK_* env vars are honored as a fallback so existing setups keep working.
 */
export class GroqService implements AIProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(opts?: { apiKey?: string; baseUrl?: string; model?: string }) {
    this.apiKey =
      opts?.apiKey ?? process.env.GROQ_API_KEY ?? process.env.GROK_API_KEY ?? "";
    this.baseUrl = (
      opts?.baseUrl ??
      process.env.GROQ_API_URL ??
      process.env.GROK_API_URL ??
      DEFAULT_URL
    ).replace(/\/$/, "");
    this.model =
      opts?.model ?? process.env.GROQ_MODEL ?? process.env.GROK_MODEL ?? DEFAULT_MODEL;
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async generateMessage(input: GenerateMessageInput): Promise<string> {
    const prompt = buildPrompt(input);
    if (!this.isConfigured()) {
      logger.warn("ai.fallback_template", { reason: "missing_key" });
      return fallbackTemplate(input);
    }
    let lastErr: unknown = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const text = await this.callOnce(prompt);
        const parsed = aiMessageOutputSchema.safeParse({ message: text.trim() });
        if (!parsed.success) throw new Error("AI output failed validation");
        return parsed.data.message;
      } catch (err) {
        lastErr = err;
        const msg = (err as Error).message ?? "";
        logger.warn("ai.generate_retry", { attempt, error: msg });
        // Don't retry auth errors
        if (/401|403|invalid api key/i.test(msg)) break;
        await sleep(1000 * attempt);
      }
    }
    // Graceful degradation: still produce a personalized (non-generic) template so campaigns aren't blocked.
    logger.error("ai.generate_failed_fallback", { error: (lastErr as Error)?.message });
    return fallbackTemplate(input);
  }

  private async callOnce(prompt: string): Promise<string> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: "You write short personalized WhatsApp outreach messages." },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 400,
        }),
        signal: ctrl.signal,
      });
      if (res.status === 429) throw new Error("AI rate limited (429)");
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Groq API error ${res.status}: ${body.slice(0, 300)}`);
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("Empty AI response");
      return text;
    } finally {
      clearTimeout(t);
    }
  }
}

/** Deterministic personalized fallback (used when key missing or API fails). */
export function fallbackTemplate(input: GenerateMessageInput): string {
  return (
    `Hi ${input.name},\n\n` +
    `I came across ${input.businessName} and noticed your work in ${input.businessWork}. ` +
    `${input.objective}. We help businesses like yours get more enquiries online.\n\n` +
    `I'd love to share a couple of ideas tailored for ${input.businessName}. ${input.cta}?`
  ).slice(0, 1500);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const aiService: AIProvider = new GroqService();
