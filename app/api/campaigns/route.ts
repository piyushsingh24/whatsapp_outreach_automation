import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse, Errors } from "@/lib/errors";
import { createCampaignSchema } from "@/validators/campaign";
import { createCampaign } from "@/services/campaign/campaign.service";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const campaigns = await prisma.campaign.findMany({
      where: { userId, ...(status ? { status: status as never } : {}) },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return Response.json({ campaigns });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = createCampaignSchema.safeParse(body);
    if (!parsed.success) throw Errors.validation("Invalid campaign data", parsed.error.flatten());
    const { campaign, skippedBlocked } = await createCampaign(userId, parsed.data);
    return Response.json({ campaign, skippedBlocked }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
