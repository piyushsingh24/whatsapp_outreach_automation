import { prisma } from "@/lib/prisma";
import { evolutionWebhookSchema } from "@/validators/webhook";
import { logger } from "@/lib/logger";
import { refreshCampaignCounters } from "@/services/campaign/campaign.service";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/evolution
 * Idempotent: dedupe on (eventId, event) via WebhookEvent unique constraint.
 * Maps Evolution message-update events to SENT/DELIVERED/READ/FAILED.
 */
export async function POST(req: Request) {
  try {
    // Optional shared-secret check
    const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
    if (secret) {
      const got = req.headers.get("x-webhook-secret") ?? req.headers.get("apikey");
      if (got !== secret) {
        logger.warn("webhook.unauthorized", {});
        return Response.json({ error: { code: "UNAUTHORIZED", message: "Invalid webhook secret" } }, { status: 401 });
      }
    }
    const raw = await req.json().catch(() => null);
    const parsed = evolutionWebhookSchema.safeParse(raw);
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION_ERROR", message: "Invalid webhook payload" } }, { status: 400 });
    }
    const { event, instance, data } = parsed.data;
    const d = (data ?? {}) as Record<string, unknown>;
    const eventId =
      (d.messageId as string) ??
      ((d.key as Record<string, unknown> | undefined)?.id as string) ??
      (d.id as string) ??
      (raw as Record<string, unknown>)?.messageId as string ??
      null;

    // Persist + dedupe
    try {
      await prisma.webhookEvent.create({
        data: { eventId: eventId ? `${event}:${eventId}` : `${event}:${Date.now()}:${Math.random()}`, event, instance, payload: raw as object },
      });
    } catch (err) {
      // Unique violation => duplicate delivery; acknowledge without reprocessing
      logger.info("webhook.duplicate", { event, eventId });
      return Response.json({ ok: true, deduped: true });
    }

    await processEvent(event, instance ?? "", d, eventId);

    await prisma.webhookEvent.updateMany({
      where: { eventId: eventId ? `${event}:${eventId}` : undefined, event },
      data: { processed: true },
    }).catch(() => undefined);

    return Response.json({ ok: true });
  } catch (err) {
    logger.error("webhook.failed", { error: (err as Error).message });
    return Response.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Webhook failed" } }, { status: 500 });
  }
}

function normalizeStatus(event: string, data: Record<string, unknown>): "SENT" | "DELIVERED" | "READ" | "FAILED" | null {
  const e = event.toLowerCase();
  const statusField = String(data.status ?? data.type ?? "").toLowerCase();
  const combined = `${e} ${statusField}`;
  if (/read|seen|blue/.test(combined)) return "READ";
  if (/deliver/.test(combined)) return "DELIVERED";
  if (/sent|ack1|server_ack/.test(combined)) return "SENT";
  if (/fail|error|nack|undeliver|reject/.test(combined)) return "FAILED";
  if (e.includes("messages.update")) {
    // Evolution messages.update carries statusUpdate: SENT/DELIVERED/READ/PLAYED
    const u = String((data as { statusUpdate?: unknown }).statusUpdate ?? "").toUpperCase();
    if (u === "READ" || u === "PLAYED") return "READ";
    if (u === "DELIVERED") return "DELIVERED";
    if (u === "SENT" || u === "SERVER_ACK") return "SENT";
    if (u === "ERROR" || u === "FAILED") return "FAILED";
  }
  return null;
}

async function processEvent(event: string, instance: string, data: Record<string, unknown>, eventId: string | null) {
  const target = normalizeStatus(event, data);
  const externalId =
    eventId ??
    ((data.key as Record<string, unknown> | undefined)?.id as string) ??
    null;
  if (!target || !externalId) {
    logger.info("webhook.ignored", { event, instance });
    return;
  }
  const msg = await prisma.message.findFirst({ where: { evolutionMessageId: String(externalId) } });
  if (!msg) {
    logger.info("webhook.unknown_message", { event, externalId });
    return;
  }
  const patch: Record<string, unknown> = { status: target };
  if (target === "DELIVERED") patch.deliveredAt = new Date();
  if (target === "READ") { patch.readAt = new Date(); patch.deliveredAt = msg.deliveredAt ?? new Date(); }
  if (target === "FAILED") {
    patch.failedAt = new Date();
    patch.failureReason = String(data.reason ?? data.error ?? "Delivery failed").slice(0, 500);
  }
  // Only allow forward progress (don't regress READ → SENT)
  const rank: Record<string, number> = { SENDING: 0, SENT: 1, DELIVERED: 2, READ: 3, FAILED: 4 };
  const cur = rank[msg.status] ?? -1;
  const next = rank[target] ?? -1;
  if (msg.status === "FAILED" && target !== "FAILED") {
    // allow recovery
  } else if (next < cur) {
    logger.info("webhook.regression_ignored", { messageId: msg.id, from: msg.status, to: target });
    return;
  }
  await prisma.message.update({ where: { id: msg.id }, data: patch as never });
  await refreshCampaignCounters(msg.campaignId).catch(() => undefined);
  logger.info("webhook.message_updated", { messageId: msg.id, to: target, event });
}
