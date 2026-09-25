export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * Public liveness probe for Render health checks + 10-min cron pings.
 * Always 200 when the web process is alive; backend statuses are
 * informational only (never fail the probe — Render restarts on failure).
 */
export async function GET() {
  const started = Date.now();
  const checks: Record<string, string> = {};

  // Shallow DB check with a tight timeout — informational only.
  try {
    const { prisma } = await import("@/lib/prisma");
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
    ]);
    checks.database = "ok";
  } catch {
    checks.database = "unreachable";
  }

  // Shallow Redis check — informational only.
  try {
    const { getRedis } = await import("@/lib/redis");
    await Promise.race([
      getRedis().ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
    ]);
    checks.redis = "ok";
  } catch {
    checks.redis = "unreachable";
  }

  return Response.json({
    ok: true,
    service: "whatsapp-outreach-web",
    time: new Date().toISOString(),
    latencyMs: Date.now() - started,
    checks,
  });
}
