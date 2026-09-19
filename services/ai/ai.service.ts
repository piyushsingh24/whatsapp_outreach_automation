import type { GenerateMessageInput } from "@/types";

/** Provider-agnostic AI interface. App code depends on this, not on Groq. */
export interface AIProvider {
  generateMessage(input: GenerateMessageInput): Promise<string>;
  isConfigured(): boolean;
}

export function buildPrompt(input: GenerateMessageInput): string {
  return [
    "You are an expert WhatsApp outreach copywriter for small businesses.",
    `Write a personalized WhatsApp message in ${input.language} with a ${input.tone} tone.`,
    "",
    "Prospect:",
    `- Name: ${input.name}`,
    `- Business: ${input.businessName}`,
    `- Business type: ${input.businessWork}`,
    "",
    "Campaign:",
    `- Objective: ${input.objective}`,
    `- Call to action: ${input.cta}`,
    "",
    "Rules:",
    "- Reference the prospect's business type specifically (show you understand it); never be generic.",
    "- Keep it under 500 characters, conversational, no spammy claims.",
    "- Start with Hi <name>, and end with the call to action as a question.",
    "- Do NOT use placeholders like {{name}}; use the real values.",
    "- Output ONLY the message text, no quotes, no preamble.",
  ].join("\n");
}
