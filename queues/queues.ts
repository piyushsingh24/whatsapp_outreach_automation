import { Queue, QueueEvents } from "bullmq";
import { getRedis } from "@/lib/redis";

export const GENERATION_QUEUE = "campaign-generation";
export const SENDING_QUEUE = "message-sending";

export interface GenerationJob {
  campaignId: string;
  userId: string;
}

export interface SendJob {
  messageId: string;
  campaignId: string;
  userId: string;
}

const globalQueues = globalThis as unknown as {
  genQueue?: Queue<GenerationJob>;
  sendQueue?: Queue<SendJob>;
};

function defaultJobOpts() {
  return {
    attempts: 3,
    backoff: { type: "exponential" as const, delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  };
}

export function getGenerationQueue(): Queue<GenerationJob> {
  if (!globalQueues.genQueue) {
    globalQueues.genQueue = new Queue<GenerationJob>(GENERATION_QUEUE, {
      connection: getRedis().duplicate(),
      defaultJobOptions: defaultJobOpts(),
    });
  }
  return globalQueues.genQueue;
}

export function getSendingQueue(): Queue<SendJob> {
  if (!globalQueues.sendQueue) {
    globalQueues.sendQueue = new Queue<SendJob>(SENDING_QUEUE, {
      connection: getRedis().duplicate(),
      defaultJobOptions: defaultJobOpts(),
    });
  }
  return globalQueues.sendQueue;
}

export async function enqueueGeneration(job: GenerationJob) {
  return getGenerationQueue().add(`gen-${job.campaignId}`, job, {
    jobId: `gen-${job.campaignId}-${Date.now()}`,
  });
}

export async function enqueueSend(job: SendJob) {
  return getSendingQueue().add(`send-${job.messageId}`, job, {
    jobId: `send-${job.messageId}`,
  });
}

export function getQueueEvents(name: string): QueueEvents {
  return new QueueEvents(name, { connection: getRedis().duplicate() });
}
