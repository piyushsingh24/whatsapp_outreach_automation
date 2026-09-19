import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse, Errors } from "@/lib/errors";
import { getCampaignForUser } from "@/services/campaign/campaign.service";
import { messageQuerySchema } from "@/validators/message";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const campaign = await getCampaignForUser(userId, params.id);
    const url = new URL(req.url);
    const parsed = messageQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) throw Errors.validation("Invalid query", parsed.error.flatten());
    const { status, search, page, pageSize } = parsed.data;
    const where: Record<string, unknown> = { campaignId: campaign.id };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { phone: { contains: search } },
        { finalBody: { contains: search } },
        { generatedBody: { contains: search } },
      ];
    }
    const [total, messages] = await Promise.all([
      prisma.message.count({ where: where as never }),
      prisma.message.findMany({
        where: where as never,
        include: { contact: { select: { id: true, name: true, businessName: true, businessWork: true, phone: true, status: true } } },
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return Response.json({ messages, total, page, pageSize });
  } catch (err) {
    return toErrorResponse(err);
  }
}
