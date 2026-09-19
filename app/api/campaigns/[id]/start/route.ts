import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse, Errors } from "@/lib/errors";
import { getCampaignForUser, transitionCampaign } from "@/services/campaign/campaign.service";
import { enqueueSend } from "@/queues/queues";
import { logger } from "@/lib/logger";

/** POST /api/campaigns/:id/start — APPROVED → RUNNING, enqueue approved messages. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const campaign = await getCampaignForUser(userId, params.id);

    // Must have a connected WhatsApp instance (or global Evolution config)
    const instance = await prisma.whatsAppInstance.findFirst({
      where: { userId, status: "CONNECTED" },
    });
    if (!instance && !(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY)) {
      throw Errors.conflict("Connect WhatsApp before launching the campaign");
    }

    const messages = await prisma.message.findMany({
      where: { campaignId: campaign.id, status: "APPROVED" },
      include: { contact: { select: { status: true } } },
      take: campaign.maxMessages,
    });
    // Backend opt-out enforcement
    const sendable = messages.filter((m) => !["OPTED_OUT", "BLOCKED", "INVALID"].includes(m.contact.status));
    if (sendable.length === 0) throw Errors.conflict("No approved sendable messages to launch");

    const updated = await transitionCampaign(userId, campaign.id, "RUNNING");

    // Mark QUEUED then enqueue with pacing delay
    for (let i = 0; i < sendable.length; i++) {
      const m = sendable[i];
      await prisma.message.update({ where: { id: m.id }, data: { status: "QUEUED" } });
      const delay = i * (campaign.delayBetweenMs || 0);
      const { getSendingQueue } = await import("@/queues/queues");
      await getSendingQueue().add(
        `send-${m.id}`,
        { messageId: m.id, campaignId: campaign.id, userId },
        { jobId: `send-${m.id}-${Date.now()}`, delay }
      );
    }
    // Mark skipped (opted-out etc.) explicitly
    const skipped = messages.length - sendable.length;
    logger.info("campaign.started", { campaignId: campaign.id, queued: sendable.length, skipped });

    return Response.json({ campaign: updated, queued: sendable.length, skipped });
  } catch (err) {
    return toErrorResponse(err);
  }
}
