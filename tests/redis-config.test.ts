import { describe, it, expect } from "vitest";
import { resolveRedisUrl, describeRedisUrl } from "@/lib/redis";

describe("resolveRedisUrl", () => {
  it("prefers REDIS_URL when set", () => {
    expect(
      resolveRedisUrl({ REDIS_URL: "rediss://default:pw@host.upstash.io:6379" })
    ).toBe("rediss://default:pw@host.upstash.io:6379");
  });

  it("falls back to localhost when nothing is set", () => {
    expect(resolveRedisUrl({})).toBe("redis://localhost:6379");
  });

  it("uses the Upstash endpoint as-is when it already has auth", () => {
    expect(
      resolveRedisUrl({
        UPSTASH_REDIS_URL: "rediss://default:pw@host.upstash.io:6379",
      })
    ).toBe("rediss://default:pw@host.upstash.io:6379");
  });

  it("injects UPSTASH_REDIS_TOKEN into a bare Upstash endpoint", () => {
    expect(
      resolveRedisUrl({
        UPSTASH_REDIS_URL: "rediss://host.upstash.io:6379",
        UPSTASH_REDIS_TOKEN: "s3cret",
      })
    ).toBe("rediss://default:s3cret@host.upstash.io:6379");
  });

  it("builds a rediss URL from a bare Upstash hostname", () => {
    expect(
      resolveRedisUrl({
        UPSTASH_REDIS_URL: "host.upstash.io",
        UPSTASH_REDIS_TOKEN: "s3cret",
      })
    ).toBe("rediss://default:s3cret@host.upstash.io:6379");
  });
});

describe("describeRedisUrl", () => {
  it("strips credentials for safe logging", () => {
    expect(describeRedisUrl("rediss://default:s3cret@host.upstash.io:6379")).toBe(
      "rediss://host.upstash.io:6379"
    );
  });
});
