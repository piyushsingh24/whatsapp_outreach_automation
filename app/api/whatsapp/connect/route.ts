import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse, Errors } from "@/lib/errors";
import { whatsappService, EvolutionError } from "@/services/whatsapp/evolution.service";
import { whatsappConnectSchema } from "@/validators/webhook";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => ({}));
    const parsed = whatsappConnectSchema.safeParse(body);
    if (!parsed.success) throw Errors.validation("Invalid instance data", parsed.error.flatten());
    const { name } = parsed.data;
    if (!whatsappService.isConfigured()) throw Errors.external("Evolution API is not configured");

    const created = await whatsappService.createInstance(name);
    const status = created.qr ? "QR_REQUIRED" : "CONNECTING";
    const instance = await prisma.whatsAppInstance.upsert({
      where: { userId_name: { userId, name } },
      create: { userId, name, status: status as never, qrCode: created.qr, pairingCode: created.pairingCode },
      update: { status: status as never, qrCode: created.qr, pairingCode: created.pairingCode, lastError: null },
    });
    await prisma.auditLog.create({ data: { userId, action: "WHATSAPP_CONNECTED", metadata: { name } } }).catch(() => undefined);
    logger.info("whatsapp.connect", { userId, name });
    return Response.json({ instance, qr: created.qr }, { status: 201 });
  } catch (err) {
    if (err instanceof EvolutionError) {
      // Surface Evolution's own message (e.g. Bad Request details) instead
      // of a generic 500 so the UI can show what actually went wrong.
      const status = err.status >= 400 && err.status < 600 ? err.status : 502;
      return Response.json(
        { error: { code: "EXTERNAL_SERVICE_ERROR", message: err.message } },
        { status }
      );
    }
    return toErrorResponse(err);
  }
}
