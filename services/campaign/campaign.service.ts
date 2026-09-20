import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Errors } from "@/lib/errors";
import { assertCampaignTransition } from "@/services/campaign/transitions";
import type { CreateCampaignInput } from "@/validators/campaign";

/** Create campaign + attach contacts + create PENDING messages. */
export async function createCampaign(userId: string, input: CreateCampaignInput) {
  // Ownership + sendability: only include user's contacts that are sendable
  const contacts = await prisma.contact.findMany({
    where: { userId, id: { in: input.contactIds } },
    select: { id: true, phone: true, status: true },
  });
  if (contacts.length === 0) throw Errors.validation("No valid contacts selected");
  const blocked = contacts.filter((c) => ["OPTED_OUT", "BLOCKED", "INVALID"].includes(c.status));
  const eligible = contacts.filter((c) => !["OPTED_OUT", "BLOCKED", "INVALID"].includes(c.status));

  const campaign = await prisma.campaign.create({
    data: {
      userId,
      name: input.name,
      description: input.description || "",
      objective: input.objective,
      tone: input.tone,
      language: input.language,
      cta: input.cta,
      status: "DRAFT",
      messagesPerBatch: input.messagesPerBatch,
      delayBetweenMs: input.delayBetweenMs,
      maxMessages: input.maxMessages,
      maxRetries: input.maxRetries,
      totalContacts: eligible.length,
    },
  });

  if (eligible.length > 0) {
    await prisma.campaignContact.createMany({
      data: eligible.map((c) => ({ campaignId: campaign.id, contactId: c.id })),
      skipDuplicates: true,
    });
    await prisma.message.createMany({
      data: eligible.map((c) => ({
        campaignId: campaign.id,
        contactId: c.id,
        phone: c.phone,
        status: "PENDING",
      })),
      skipDuplicates: true,
    });
  }

  await prisma.auditLog.create({
    data: {
      userId,
      campaignId: campaign.id,
      action: "CAMPAIGN_CREATED",
      metadata: { total: contacts.length, eligible: eligible.length, blocked: blocked.length },
    },
  });

  logger.info("campaign.created", { campaignId: campaign.id, userId, eligible: eligible.length, skipped: blocked.length });
  return { campaign, skippedBlocked: blocked.length };
}

export async function getCampaignForUser(userId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId } });
  if (!campaign) throw Errors.notFound("Campaign");
  return campaign;
}

export async function transitionCampaign(userId: string, campaignId: string, to: "APPROVED" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED" | "GENERATING" | "READY_FOR_REVIEW" | "FAILED" | "DRAFT") {
  const campaign = await getCampaignForUser(userId, campaignId);
  assertCampaignTransition(campaign.status as never, to as never);
  const data: Record<string, unknown> = { status: to };
  if (to === "RUNNING" && !campaign.startedAt) data.startedAt = new Date();
  if (to === "COMPLETED" || to === "CANCELLED") data.completedAt = new Date();
  const updated = await prisma.campaign.update({ where: { id: campaign.id }, data: data as never });
  const actionMap: Record<string, "CAMPAIGN_APPROVED" | "CAMPAIGN_STARTED" | "CAMPAIGN_PAUSED" | "CAMPAIGN_RESUMED" | "CAMPAIGN_STOPPED" | "CAMPAIGN_COMPLETED"> = {
    APPROVED: "CAMPAIGN_APPROVED",
    RUNNING: campaign.status === "PAUSED" ? "CAMPAIGN_RESUMED" : "CAMPAIGN_STARTED",
    PAUSED: "CAMPAIGN_PAUSED",
    CANCELLED: "CAMPAIGN_STOPPED",
    COMPLETED: "CAMPAIGN_COMPLETED",
  };
  if (actionMap[to]) {
    await prisma.auditLog.create({ data: { userId, campaignId, action: actionMap[to] } });
  }
  logger.info("campaign.transition", { campaignId, from: campaign.status, to });
  return updated;
}

/** Refresh denormalized counters from messages table. */
export async function refreshCampaignCounters(campaignId: string) {
  const [sent, delivered, read, failed] = await Promise.all([
    prisma.message.count({ where: { campaignId, status: { in: ["SENT", "DELIVERED", "READ"] } } }),
    prisma.message.count({ where: { campaignId, status: { in: ["DELIVERED", "READ"] } } }),
    prisma.message.count({ where: { campaignId, status: "READ" } }),
    prisma.message.count({ where: { campaignId, status: "FAILED" } }),
  ]);
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { sentCount: sent, deliveredCount: delivered, readCount: read, failedCount: failed },
  });
}
