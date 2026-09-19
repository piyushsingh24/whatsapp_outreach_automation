import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse, Errors } from "@/lib/errors";
import { updateMessageSchema } from "@/validators/message";
import { canTransitionMessage } from "@/services/campaign/transitions";
import { logger } from "@/lib/logger";

async function ownedMessage(userId: string, id: string) {
  const msg = await prisma.message.findFirst({
    where: { id, campaign: { userId } },
    include: { campaign: { select: { id: true, userId: true, status: true } } },
  });
  if (!msg) throw Errors.notFound("Message");
  return msg;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const msg = await ownedMessage(userId, params.id);
    const body = await req.json();
    const parsed = updateMessageSchema.safeParse(body);
    if (!parsed.success) throw Errors.validation("Invalid message data", parsed.error.flatten());

    const data: Record<string, unknown> = {};
    if (parsed.data.finalBody !== undefined) data.finalBody = parsed.data.finalBody;
    if (parsed.data.status) {
      const target = parsed.data.status === "REJECTED" ? "REJECTED" : parsed.data.status;
      if (!canTransitionMessage(msg.status as never, target as never)) {
        throw Errors.conflict(`Cannot transition message ${msg.status} → ${target}`);
      }
      data.status = target;
      if (target === "APPROVED") {
        data.approvedAt = new Date();
        if (!data.finalBody && !msg.finalBody) data.finalBody = msg.generatedBody;
      }
    }
    const updated = await prisma.message.update({ where: { id: msg.id }, data: data as never });
    await prisma.auditLog.create({
      data: { userId, campaignId: msg.campaignId, action: parsed.data.status === "APPROVED" ? "MESSAGE_APPROVED" : "MESSAGE_EDITED", metadata: { messageId: msg.id } },
    }).catch(() => undefined);
    logger.info("message.updated", { messageId: msg.id, userId });
    return Response.json({ message: updated });
  } catch (err) {
    return toErrorResponse(err);
  }
}
