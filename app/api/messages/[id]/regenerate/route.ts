import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse, Errors } from "@/lib/errors";
import { aiService } from "@/services/ai/groq.service";
import { logger } from "@/lib/logger";

/** POST /api/messages/:id/regenerate — regenerate a single message with Groq. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const msg = await prisma.message.findFirst({
      where: { id: params.id, campaign: { userId } },
      include: { contact: true, campaign: true },
    });
    if (!msg) throw Errors.notFound("Message");
    if (["SENT", "DELIVERED", "READ", "SENDING", "QUEUED"].includes(msg.status)) {
      throw Errors.conflict(`Cannot regenerate message in status ${msg.status}`);
    }
    await prisma.message.update({ where: { id: msg.id }, data: { status: "GENERATING" } });
    try {
      const body = await aiService.generateMessage({
        name: msg.contact.name,
        businessName: msg.contact.businessName,
        businessWork: msg.contact.businessWork,
        objective: msg.campaign.objective,
        tone: msg.campaign.tone,
        language: msg.campaign.language,
        cta: msg.campaign.cta,
      });
      const updated = await prisma.message.update({
        where: { id: msg.id },
        data: { generatedBody: body, finalBody: body, status: "GENERATED", failureReason: null },
      });
      logger.info("message.regenerated", { messageId: msg.id });
      return Response.json({ message: updated });
    } catch (err) {
      await prisma.message.update({
        where: { id: msg.id },
        data: { status: "FAILED", failureReason: (err as Error).message?.slice(0, 500) },
      });
      throw err;
    }
  } catch (err) {
    return toErrorResponse(err);
  }
}
