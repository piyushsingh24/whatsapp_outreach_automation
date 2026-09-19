import type { CampaignStatus, MessageStatus } from "@/types";

/** Allowed campaign transitions. Invalid transitions throw. */
const TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ["GENERATING", "CANCELLED"],
  GENERATING: ["READY_FOR_REVIEW", "FAILED", "CANCELLED"],
  READY_FOR_REVIEW: ["APPROVED", "GENERATING", "CANCELLED"],
  APPROVED: ["RUNNING", "CANCELLED"],
  RUNNING: ["PAUSED", "COMPLETED", "CANCELLED", "FAILED"],
  PAUSED: ["RUNNING", "CANCELLED", "COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  FAILED: ["GENERATING"],
};

export function canTransitionCampaign(from: CampaignStatus, to: CampaignStatus): boolean {
  return (TRANSITIONS[from] ?? []).includes(to);
}

export function assertCampaignTransition(from: CampaignStatus, to: CampaignStatus) {
  if (!canTransitionCampaign(from, to)) {
    throw new Error(`Invalid campaign transition: ${from} → ${to}`);
  }
}

/** Allowed message transitions (controlled, predictable). */
const MESSAGE_TRANSITIONS: Record<MessageStatus, MessageStatus[]> = {
  PENDING: ["GENERATING", "SKIPPED", "FAILED"],
  GENERATING: ["GENERATED", "FAILED", "SKIPPED"],
  GENERATED: ["APPROVED", "REJECTED", "GENERATING"],
  APPROVED: ["QUEUED", "REJECTED", "GENERATING"],
  REJECTED: ["GENERATING", "APPROVED"],
  QUEUED: ["SENDING", "SKIPPED", "FAILED"],
  SENDING: ["SENT", "FAILED"],
  SENT: ["DELIVERED", "READ", "FAILED"],
  DELIVERED: ["READ", "FAILED"],
  READ: [],
  FAILED: ["QUEUED"],
  SKIPPED: ["QUEUED", "GENERATING"],
};

export function canTransitionMessage(from: MessageStatus, to: MessageStatus): boolean {
  return (MESSAGE_TRANSITIONS[from] ?? []).includes(to);
}
