import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse } from "@/lib/errors";
import { whatsappService } from "@/services/whatsapp/evolution.service";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const name = url.searchParams.get("name") ?? process.env.EVOLUTION_INSTANCE ?? "business-01";
    const instances = await prisma.whatsAppInstance.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });

    // Live-refresh the requested instance if Evolution is configured
    let live: { status: string; phone?: string; qr?: string } | null = null;
    if (whatsappService.isConfigured()) {
      live = await whatsappService.getStatus(name);
      await prisma.whatsAppInstance.upsert({
        where: { userId_name: { userId, name } },
        create: { userId, name, status: (live.status as never) ?? "DISCONNECTED", phone: live.phone, qrCode: live.qr },
        update: { status: (live.status as never) ?? "DISCONNECTED", phone: live.phone, qrCode: live.qr ?? undefined },
      }).catch(() => undefined);
    }
    const refreshed = await prisma.whatsAppInstance.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
    return Response.json({ instances: refreshed.length ? refreshed : instances, live });
  } catch (err) {
    return toErrorResponse(err);
  }
}
