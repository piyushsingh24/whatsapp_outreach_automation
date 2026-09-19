import { createGenerationWorker } from "@/workers/generation.worker";
import { createSendingWorker } from "@/workers/sending.worker";
import { logger } from "@/lib/logger";

async function main() {
  logger.info("worker.boot", { pid: process.pid });
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
