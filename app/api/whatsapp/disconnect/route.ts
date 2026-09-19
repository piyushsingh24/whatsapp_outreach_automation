import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse } from "@/lib/errors";
import { whatsappService } from "@/services/whatsapp/evolution.service";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? process.env.EVOLUTION_INSTANCE ?? "business-01");
    if (whatsappService.isConfigured()) {
      await whatsappService.disconnect(name).catch(() => undefined);
    }
    await prisma.whatsAppInstance.updateMany({ where: { userId, name }, data: { status: "DISCONNECTED", qrCode: null } });
    await prisma.auditLog.create({ data: { userId, action: "WHATSAPP_DISCONNECTED", metadata: { name } } }).catch(() => undefined);
    logger.info("whatsapp.disconnect", { userId, name });
    return Response.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
