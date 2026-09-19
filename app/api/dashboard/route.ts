import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse } from "@/lib/errors";

export async function GET() {
  try {
    const userId = await requireUserId();
    const [totalContacts, activeCampaigns, sent, delivered, failed, pending, recent] = await Promise.all([
      prisma.contact.count({ where: { userId } }),
      prisma.campaign.count({ where: { userId, status: { in: ["RUNNING", "PAUSED", "APPROVED", "GENERATING"] } } }),
      prisma.message.count({ where: { campaign: { userId }, status: { in: ["SENT", "DELIVERED", "READ"] } } }),
      prisma.message.count({ where: { campaign: { userId }, status: { in: ["DELIVERED", "READ"] } } }),
      prisma.message.count({ where: { campaign: { userId }, status: "FAILED" } }),
      prisma.message.count({
        where: { campaign: { userId }, status: { in: ["PENDING", "GENERATING", "QUEUED", "SENDING", "APPROVED", "GENERATED"] } },
      }),
      prisma.campaign.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, name: true, status: true, totalContacts: true, sentCount: true, deliveredCount: true, failedCount: true, updatedAt: true },
      }),
    ]);
    return Response.json({
      metrics: { totalContacts, activeCampaigns, sent, delivered, failed, pending },
      recentCampaigns: recent,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
