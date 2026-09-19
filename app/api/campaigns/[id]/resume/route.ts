import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse } from "@/lib/errors";
import { getCampaignForUser, transitionCampaign } from "@/services/campaign/campaign.service";
import { getSendingQueue } from "@/queues/queues";

/** POST /api/campaigns/:id/resume — PAUSED → RUNNING, re-enqueue approved/queued/sending-stuck messages */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const campaign = await getCampaignForUser(userId, params.id);
    const updated = await transitionCampaign(userId, campaign.id, "RUNNING");
    const stuck = await prisma.message.findMany({
      where: { campaignId: campaign.id, status: { in: ["APPROVED", "QUEUED", "FAILED"] } },
      take: 1000,
    });
    const queue = getSendingQueue();
    for (const m of stuck) {
      const status = m.status === "FAILED" && m.attempts >= campaign.maxRetries ? "FAILED" : "QUEUED";
      if (status === "QUEUED") {
        await prisma.message.update({ where: { id: m.id }, data: { status: "QUEUED" } });
        await queue.add(`send-${m.id}`, { messageId: m.id, campaignId: campaign.id, userId }, { jobId: `send-${m.id}-resume-${Date.now()}` });
      }
    }
    return Response.json({ campaign: updated, requeued: stuck.length });
  } catch (err) {
    return toErrorResponse(err);
  }
}
