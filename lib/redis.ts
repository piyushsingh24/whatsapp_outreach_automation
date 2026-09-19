import IORedis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis?: IORedis;
  redisWorker?: IORedis;
};

/**
 * Resolve the Redis connection URL.
 *
 * Priority:
 * 1. REDIS_URL — full URL, e.g. `redis://localhost:6379` or an Upstash
 *    TLS endpoint `rediss://default:PASSWORD@HOST.upstash.io:6379`.
 * 2. UPSTASH_REDIS_URL + UPSTASH_REDIS_TOKEN — split form of the same
 *    Upstash TCP endpoint (password injected if the URL has no auth part).
 * 3. Fallback: local `redis://localhost:6379`.
 *
 * NOTE: BullMQ speaks the native Redis protocol, so this must be the
 * "Redis" endpoint from Upstash Console → Database → Connect — NOT the
 * REST URL (`https://....upstash.io`) / REST token, which only work with
 * the HTTP API and cannot power queues.
 */
export function resolveRedisUrl(env: Record<string, string | undefined> = process.env): string {
  const direct = env.REDIS_URL?.trim();
  if (direct) return direct;

  const endpoint = env.UPSTASH_REDIS_URL?.trim();
  if (endpoint) {
    const token = env.UPSTASH_REDIS_TOKEN?.trim() ?? "";
    if (endpoint.startsWith("redis://") || endpoint.startsWith("rediss://")) {
      if (endpoint.includes("@") || !token) return endpoint;
      return endpoint.replace("://", `://default:${encodeURIComponent(token)}@`);
    }
    // Bare hostname (with or without port) → assume Upstash TLS endpoint.
    const auth = token ? `default:${encodeURIComponent(token)}@` : "";
    const hostPort = endpoint.includes(":") ? endpoint : `${endpoint}:6379`;
    return `rediss://${auth}${hostPort}`;
  }

  return "redis://localhost:6379";
}

/** Host description without credentials — safe to log. */
export function describeRedisUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "(invalid url)";
  }
}

function createClient(): IORedis {
  const url = resolveRedisUrl();
  const isTls = url.startsWith("rediss://");
  const client = new IORedis(url, {
    // Required by BullMQ.
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    // Upstash only accepts TLS connections (`rediss://`); ioredis enables
    // TLS from the scheme, this makes it explicit.
    ...(isTls ? { tls: {} } : {}),
    // Upstash closes idle connections; reconnect with capped backoff.
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });
  client.on("error", (err) => {
    // Avoid crashing on transient redis errors; workers/queues handle retries.
    console.error("[redis] connection error:", (err as Error).message);
  });
  return client;
}

/** Shared client for queue producers / app code. */
export function getRedis(): IORedis {
  if (!globalForRedis.redis) globalForRedis.redis = createClient();
  return globalForRedis.redis;
}

/** Separate connection for BullMQ workers (BullMQ requires distinct connections). */
export function getWorkerConnection(): IORedis {
  if (!globalForRedis.redisWorker) globalForRedis.redisWorker = createClient();
  return globalForRedis.redisWorker;
}

export const redis = new Proxy({} as IORedis, {
  get(_t, prop) {
    return (getRedis() as unknown as Record<string | symbol, unknown>)[prop as string];
  },
});
