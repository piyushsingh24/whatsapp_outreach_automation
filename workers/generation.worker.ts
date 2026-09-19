import { Worker, type Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getWorkerConnection } from "@/lib/redis";
import { aiService } from "@/services/ai/groq.service";
import { canTransitionMessage } from "@/services/campaign/transitions";
import { refreshCampaignCounters } from "@/services/campaign/campaign.service";
import type { GenerationJob } from "@/queues/queues";

export const GENERATION_QUEUE = "campaign-generation";

/** Generate AI messages for all PENDING messages of a campaign. */
export async function processGenerationJob(job: Job<GenerationJob>) {
  const { campaignId } = job.data;
  logger.info("worker.generation.start", { campaignId, jobId: job.id });

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { messages: { where: { status: "PENDING" }, include: { contact: true }, take: 1000 } },
  });
  if (!campaign) {
    logger.warn("worker.generation.no_campaign", { campaignId });
    return;
  }
  if (["CANCELLED", "COMPLETED", "PAUSED"].includes(campaign.status)) {
    logger.info("worker.generation.skipped_state", { campaignId, status: campaign.status });
    return;
  }

  await prisma.campaign.update({ where: { id: campaignId }, data: { status: "GENERATING" } }).catch(() => undefined);

  let generated = 0;
  for (const msg of campaign.messages) {
    // Respect pause/cancel mid-run
    const fresh = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true } });
    if (fresh && ["CANCELLED", "PAUSED"].includes(fresh.status)) {
      logger.info("worker.generation.paused", { campaignId, status: fresh.status });
      break;
    }
    try {
      await prisma.message.update({ where: { id: msg.id }, data: { status: "GENERATING" } });
      const body = await aiService.generateMessage({
        name: msg.contact.name,
        businessName: msg.contact.businessName,
        businessWork: msg.contact.businessWork,
        objective: campaign.objective,
        tone: campaign.tone,
        language: campaign.language,
        cta: campaign.cta,
      });
      await prisma.message.update({
        where: { id: msg.id },
        data: { generatedBody: body, finalBody: body, status: "GENERATED" },
      });
      generated++;
      await job.updateProgress(Math.round((generated / campaign.messages.length) * 100)).catch(() => undefined);
    } catch (err) {
      logger.error("worker.generation.msg_failed", { messageId: msg.id, error: (err as Error).message });
      await prisma.message.update({
        where: { id: msg.id },
        data: { status: "FAILED", failureReason: (err as Error).message?.slice(0, 500) },
      }).catch(() => undefined);
    }
  }

  const remaining = await prisma.message.count({ where: { campaignId, status: { in: ["PENDING", "GENERATING"] } } });
  if (remaining === 0) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: "READY_FOR_REVIEW" } }).catch(() => undefined);
    await prisma.auditLog.create({
      data: { userId: campaign.userId, campaignId, action: "AI_MESSAGE_GENERATED", metadata: { generated } },
    }).catch(() => undefined);
  }
  await refreshCampaignCounters(campaignId).catch(() => undefined);
  logger.info("worker.generation.done", { campaignId, generated });
}

export function createGenerationWorker(): Worker<GenerationJob> {
  const worker = new Worker<GenerationJob>(GENERATION_QUEUE, processGenerationJob, {
    connection: getWorkerConnection().duplicate(),
    concurrency: 2,
  });
  worker.on("failed", (job, err) => logger.error("worker.generation.failed", { jobId: job?.id, error: err.message }));
  return worker;
}
