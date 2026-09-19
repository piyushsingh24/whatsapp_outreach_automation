import { requireUserId } from "@/lib/session";
import { toErrorResponse } from "@/lib/errors";
import { transitionCampaign } from "@/services/campaign/campaign.service";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const campaign = await transitionCampaign(userId, params.id, "PAUSED");
    return Response.json({ campaign });
  } catch (err) {
    return toErrorResponse(err);
  }
}
