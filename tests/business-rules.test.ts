import { describe, it, expect } from "vitest";
import { normalizePhone, isSendableStatus } from "@/services/contact/phone";
import { canTransitionCampaign, canTransitionMessage } from "@/services/campaign/transitions";
import { aiMessageOutputSchema } from "@/validators/message";
import { buildPrompt } from "@/services/ai/ai.service";

describe("phone normalization", () => {
  it("strips formatting and keeps digits", () => {
    expect(normalizePhone("+91 98765 43210")).toBe("919876543210");
    expect(normalizePhone("(919) 876-543210")).toBe("919876543210");
  });
  it("rejects invalid phones", () => {
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
  it("enforces opt-out rules", () => {
    expect(isSendableStatus("READY")).toBe(true);
    expect(isSendableStatus("OPTED_OUT")).toBe(false);
    expect(isSendableStatus("BLOCKED")).toBe(false);
    expect(isSendableStatus("INVALID")).toBe(false);
  });
});

describe("campaign state machine", () => {
  it("allows valid transitions", () => {
    expect(canTransitionCampaign("DRAFT", "GENERATING")).toBe(true);
    expect(canTransitionCampaign("READY_FOR_REVIEW", "APPROVED")).toBe(true);
    expect(canTransitionCampaign("APPROVED", "RUNNING")).toBe(true);
    expect(canTransitionCampaign("RUNNING", "PAUSED")).toBe(true);
    expect(canTransitionCampaign("PAUSED", "RUNNING")).toBe(true);
  });
  it("blocks invalid transitions", () => {
    expect(canTransitionCampaign("DRAFT", "RUNNING")).toBe(false);
    expect(canTransitionCampaign("COMPLETED", "RUNNING")).toBe(false);
    expect(canTransitionCampaign("READY_FOR_REVIEW", "RUNNING")).toBe(false);
  });
});

describe("message state machine", () => {
  it("does not allow skipping approval", () => {
    expect(canTransitionMessage("GENERATED", "QUEUED")).toBe(false);
    expect(canTransitionMessage("GENERATED", "APPROVED")).toBe(true);
    expect(canTransitionMessage("APPROVED", "QUEUED")).toBe(true);
  });
  it("blocks sending without approval path", () => {
    expect(canTransitionMessage("PENDING", "SENDING")).toBe(false);
  });
});

describe("AI validation + prompt", () => {
  it("rejects empty/generic-missing output", () => {
    expect(aiMessageOutputSchema.safeParse({ message: "x" }).success).toBe(false);
    expect(aiMessageOutputSchema.safeParse({ message: "Hi Rahul, this is for your dental clinic, open to a chat?" }).success).toBe(true);
  });
  it("builds business-specific prompt", () => {
    const p = buildPrompt({
      name: "Rahul",
      businessName: "Sharma Dental Clinic",
      businessWork: "Dental clinic",
      objective: "Offer websites",
      tone: "Professional",
      language: "English",
      cta: "Open to a call?",
    });
    expect(p).toContain("Sharma Dental Clinic");
    expect(p).toContain("Dental clinic");
  });
});
