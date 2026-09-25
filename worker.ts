import { createServer } from "node:http";
import { createGenerationWorker } from "@/workers/generation.worker";
import { createSendingWorker } from "@/workers/sending.worker";
import { logger } from "@/lib/logger";

/**
 * Minimal HTTP server so the worker can run as a Render Web Service
 * (free Background Workers can't be pinged). Render requires binding
 * PORT; a 10-min cron ping to /health keeps the free instance awake.
 */
function startHealthServer(): void {
  const port = Number(process.env.PORT ?? 10000);
  const server = createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: "whatsapp-outreach-worker", time: new Date().toISOString() }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  server.listen(port, () => logger.info("worker.health_listen", { port }));
}

async function main() {
  logger.info("worker.boot", { pid: process.pid });
  startHealthServer();
  const gen = createGenerationWorker();
  const send = createSendingWorker();
  logger.info("worker.ready", { queues: ["campaign-generation", "message-sending"] });

  const shutdown = async (sig: string) => {
    logger.info("worker.shutdown", { signal: sig });
    await Promise.allSettled([gen.close(), send.close()]);
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error("worker.boot_failed", { error: (err as Error).message });
  process.exit(1);
});
