import { Worker, type Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getWorkerConnection } from "@/lib/redis";
import { whatsappService } from "@/services/whatsapp/evolution.service";
import { refreshCampaignCounters } from "@/services/campaign/campaign.service";
import type { SendJob } from "@/queues/queues";

export const SENDING_QUEUE = "message-sending";

/** Send a single approved message via Evolution API. Idempotent + respects pause/cancel. */
export async function processSendJob(job: Job<SendJob>) {
  const { messageId, campaignId } = job.data;
  const msg = await prisma.message.findUnique({
    where: { id: messageId },
    include: { contact: true, campaign: true },
  });
  if (!msg) return;

  // Idempotency: already terminal → skip
  if (["SENT", "DELIVERED", "READ"].includes(msg.status)) {
    logger.info("worker.send.skip_terminal", { messageId, status: msg.status });
    return;
  }

  // Respect campaign state
  const campaign = msg.campaign;
  if (["PAUSED", "CANCELLED", "COMPLETED"].includes(campaign.status)) {
    logger.info("worker.send.skip_state", { messageId, campaignStatus: campaign.status });
    return;
  }

  // Backend opt-out enforcement (never rely on UI alone)
  if (["OPTED_OUT", "BLOCKED", "INVALID"].includes(msg.contact.status)) {
    await prisma.message.update({ where: { id: messageId }, data: { status: "SKIPPED", failureReason: `Contact ${msg.contact.status}` } });
    return;
  }

  if (!["APPROVED", "QUEUED", "FAILED"].includes(msg.status)) {
    logger.info("worker.send.skip_msg_state", { messageId, status: msg.status });
    return;
  }

  const instanceName =
    (await prisma.whatsAppInstance.findFirst({
      where: { userId: campaign.userId, status: "CONNECTED" },
      orderBy: { updatedAt: "desc" },
    }))?.name ?? process.env.EVOLUTION_INSTANCE ?? "business-01";

  try {
    await prisma.message.update({
      where: { id: messageId },
      data: { status: "SENDING", attempts: { increment: 1 } },
    });
    const body = msg.finalBody ?? msg.generatedBody;
    if (!body) throw new Error("No approved message body");
    const result = await whatsappService.sendText(instanceName, msg.phone, body);
    await prisma.message.update({
      where: { id: messageId },
      data: { status: "SENT", evolutionMessageId: result.externalId, sentAt: new Date(), failureReason: null },
    });
    await prisma.contact.update({ where: { id: msg.contactId }, data: { status: "CONTACTED" } }).catch(() => undefined);
    await prisma.auditLog.create({
      data: { userId: campaign.userId, campaignId, action: "MESSAGE_SENT", metadata: { messageId } },
    }).catch(() => undefined);
    logger.info("worker.send.sent", { messageId, externalId: result.externalId });
  } catch (err) {
    const reason = (err as Error).message?.slice(0, 500) ?? "Send failed";
    logger.error("worker.send.failed", { messageId, error: reason });
    await prisma.message.update({
      where: { id: messageId },
      data: { status: "FAILED", failedAt: new Date(), failureReason: reason },
    }).catch(() => undefined);
    await prisma.auditLog.create({
      data: { userId: campaign.userId, campaignId, action: "MESSAGE_FAILED", metadata: { messageId, reason } },
    }).catch(() => undefined);
    throw err; // let BullMQ retry transient failures
  } finally {
    await refreshCampaignCounters(campaignId).catch(() => undefined);
    await maybeCompleteCampaign(campaignId).catch(() => undefined);
  }
}

async function maybeCompleteCampaign(campaignId: string) {
  const pending = await prisma.message.count({
    where: { campaignId, status: { in: ["PENDING", "GENERATING", "GENERATED", "APPROVED", "QUEUED", "SENDING"] } },
  });
  if (pending === 0) {
    const c = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (c && c.status === "RUNNING") {
      await prisma.campaign.update({ where: { id: campaignId }, data: { status: "COMPLETED", completedAt: new Date() } });
      await prisma.auditLog.create({ data: { userId: c.userId, campaignId, action: "CAMPAIGN_COMPLETED" } }).catch(() => undefined);
    }
  }
}

export function createSendingWorker(): Worker<SendJob> {
  const worker = new Worker<SendJob>(SENDING_QUEUE, processSendJob, {
    connection: getWorkerConnection().duplicate(),
    concurrency: 5,
  });
  worker.on("failed", (job, err) => logger.error("worker.send.job_failed", { jobId: job?.id, error: err.message }));
  return worker;
}
