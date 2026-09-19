import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse } from "@/lib/errors";
import { getCampaignForUser } from "@/services/campaign/campaign.service";

/** POST /api/campaigns/:id/approve-all — approve all GENERATED messages */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const campaign = await getCampaignForUser(userId, params.id);
    const res = await prisma.message.updateMany({
      where: { campaignId: campaign.id, status: "GENERATED" },
      data: { status: "APPROVED", finalBody: undefined as never, approvedAt: new Date() },
    });
    // Ensure finalBody mirrors generatedBody where empty
    const missing = await prisma.message.findMany({
      where: { campaignId: campaign.id, status: "APPROVED", finalBody: null },
      select: { id: true, generatedBody: true },
    });
    for (const m of missing) {
      await prisma.message.update({ where: { id: m.id }, data: { finalBody: m.generatedBody, approvedAt: new Date() } });
    }
    await prisma.auditLog.create({
      data: { userId, campaignId: campaign.id, action: "MESSAGE_APPROVED", metadata: { bulk: true, count: res.count } },
    });
    return Response.json({ approved: res.count });
  } catch (err) {
    return toErrorResponse(err);
  }
}
