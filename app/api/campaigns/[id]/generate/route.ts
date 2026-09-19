import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse, Errors } from "@/lib/errors";
import { getCampaignForUser, transitionCampaign } from "@/services/campaign/campaign.service";
import { enqueueGeneration, enqueueSend, getSendingQueue } from "@/queues/queues";
import { logger } from "@/lib/logger";

/** POST /api/campaigns/:id/generate — enqueue background AI generation. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const campaign = await getCampaignForUser(userId, params.id);
    if (!["DRAFT", "FAILED"].includes(campaign.status) && campaign.status !== "READY_FOR_REVIEW") {
      // Allow re-generation from READY_FOR_REVIEW too (regenerate pending/failed)
      if (campaign.status !== "DRAFT") throw Errors.conflict(`Cannot generate in status ${campaign.status}`);
    }
    // Reset FAILED messages to PENDING so they regenerate
    await prisma.message.updateMany({
      where: { campaignId: campaign.id, status: "FAILED" },
      data: { status: "PENDING", failureReason: null },
    });
    await transitionCampaign(userId, campaign.id, "GENERATING").catch(async () => {
      // If already GENERATING, keep going
      await prisma.campaign.update({ where: { id: campaign.id }, data: { status: "GENERATING" } });
    });
    await enqueueGeneration({ campaignId: campaign.id, userId });
    logger.info("campaign.generate_enqueued", { campaignId: campaign.id, userId });
    return Response.json({ ok: true, status: "GENERATING" });
  } catch (err) {
    return toErrorResponse(err);
  }
}
