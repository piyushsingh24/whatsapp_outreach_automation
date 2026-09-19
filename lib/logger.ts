type Level = "info" | "warn" | "error" | "debug";

function log(level: Level, event: string, data?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...sanitize(data ?? {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

const SENSITIVE = [/key/i, /secret/i, /password/i, /token/i, /auth/i];

function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (SENSITIVE.some((re) => re.test(k))) out[k] = "[redacted]";
    else if (typeof v === "string" && v.length > 2000) out[k] = v.slice(0, 2000) + "…(truncated)";
    else out[k] = v;
  }
  return out;
}

export const logger = {
  info: (event: string, data?: Record<string, unknown>) => log("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) => log("warn", event, data),
  error: (event: string, data?: Record<string, unknown>) => log("error", event, data),
  debug: (event: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") log("debug", event, data);
  },
};
