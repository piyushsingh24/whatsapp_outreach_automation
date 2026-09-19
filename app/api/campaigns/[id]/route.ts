import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse, Errors } from "@/lib/errors";
import { updateCampaignSchema } from "@/validators/campaign";
import { getCampaignForUser, refreshCampaignCounters } from "@/services/campaign/campaign.service";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const campaign = await getCampaignForUser(userId, params.id);
    await refreshCampaignCounters(campaign.id).catch(() => undefined);
    const counts = await prisma.message.groupBy({
      by: ["status"],
      where: { campaignId: campaign.id },
      _count: { status: true },
    });
    const messagesByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count.status]));
    return Response.json({ campaign, messagesByStatus });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const campaign = await getCampaignForUser(userId, params.id);
    if (!["DRAFT", "READY_FOR_REVIEW"].includes(campaign.status)) {
      throw Errors.conflict(`Cannot edit campaign in status ${campaign.status}`);
    }
    const body = await req.json();
    const parsed = updateCampaignSchema.safeParse(body);
    if (!parsed.success) throw Errors.validation("Invalid campaign data", parsed.error.flatten());
    const updated = await prisma.campaign.update({ where: { id: campaign.id }, data: parsed.data as never });
    return Response.json({ campaign: updated });
  } catch (err) {
    return toErrorResponse(err);
  }
}
