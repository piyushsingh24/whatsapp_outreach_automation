import { describe, it, expect, vi, afterEach } from "vitest";
import { EvolutionService, EvolutionError } from "@/services/whatsapp/evolution.service";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(impl: (url: string, init?: RequestInit) => unknown) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

const svc = () =>
  new EvolutionService({ baseUrl: "http://evo:8080", apiKey: "test-key" });

describe("EvolutionService.createInstance", () => {
  it("parses QR + nested pairingCode from the v2.3 create response", async () => {
    const calls: string[] = [];
    mockFetch((url: string) => {
      calls.push(url);
      return jsonResponse(201, {
        instance: { instanceName: "biz", status: "connecting" },
        qrcode: { pairingCode: null, base64: "data:image/png;base64,AAA", code: "2@abc" },
      });
    });
    const res = await svc().createInstance("biz");
    expect(res.qr).toBe("data:image/png;base64,AAA");
    expect(res.status).toBe("QR_REQUIRED");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("/instance/create");
  });

  it("falls back to /instance/connect when the instance already exists (409)", async () => {
    const calls: string[] = [];
    mockFetch((url: string) => {
      calls.push(url);
      if (url.includes("/instance/create")) {
        return jsonResponse(409, { status: 409, response: { message: "already exists" } });
      }
      return jsonResponse(200, { base64: "data:image/png;base64,BBB", pairingCode: "123-456" });
    });
    const res = await svc().createInstance("biz");
    expect(res.qr).toBe("data:image/png;base64,BBB");
    expect(res.pairingCode).toBe("123-456");
    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain("/instance/connect/biz");
  });

  it("propagates non-409 failures as EvolutionError with status", async () => {
    mockFetch(() => jsonResponse(500, { error: "boom" }));
    const err = await svc().createInstance("biz").catch((e) => e);
    expect(err).toBeInstanceOf(EvolutionError);
    expect((err as EvolutionError).status).toBe(500);
  });
});

describe("EvolutionService.getStatus", () => {
  it("returns DISCONNECTED (not throw) when the instance does not exist", async () => {
    mockFetch(() => jsonResponse(404, { response: { message: "does not exist" } }));
    const res = await svc().getStatus("ghost");
    expect(res.status).toBe("DISCONNECTED");
  });

  it("maps open state to CONNECTED", async () => {
    mockFetch(() => jsonResponse(200, { instance: { state: "open" } }));
    const res = await svc().getStatus("biz");
    expect(res.status).toBe("CONNECTED");
  });
});

describe("EvolutionService.disconnect", () => {
  it("treats 404 (already gone) as success", async () => {
    mockFetch(() => jsonResponse(404, { response: { message: "does not exist" } }));
    await expect(svc().disconnect("ghost")).resolves.toBeUndefined();
  });
});
