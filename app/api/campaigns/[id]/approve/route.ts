import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse, Errors } from "@/lib/errors";
import { getCampaignForUser, transitionCampaign } from "@/services/campaign/campaign.service";

/** POST /api/campaigns/:id/approve — move READY_FOR_REVIEW → APPROVED */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const campaign = await getCampaignForUser(userId, params.id);
    const approved = await prisma.message.count({ where: { campaignId: campaign.id, status: "APPROVED" } });
    if (approved === 0) throw Errors.conflict("Approve at least one message before approving the campaign");
    const updated = await transitionCampaign(userId, campaign.id, "APPROVED");
    return Response.json({ campaign: updated });
  } catch (err) {
    return toErrorResponse(err);
  }
}
