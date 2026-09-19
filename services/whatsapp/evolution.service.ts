import type { WhatsAppProvider, SendTextResult } from "@/services/whatsapp/whatsapp.service";
import { logger } from "@/lib/logger";

const TIMEOUT_MS = 20_000;

/** Error from the Evolution API carrying the HTTP status for mapping. */
export class EvolutionError extends Error {
  status: number;
  constructor(status: number, path: string, body: string) {
    super(`Evolution API ${status} ${path}: ${body.slice(0, 300)}`);
    this.name = "EvolutionError";
    this.status = status;
  }
}

interface CreateResponse {
  instance?: { status?: string };
  qrcode?: { base64?: string; pairingCode?: string | null; code?: string };
  pairingCode?: string | null;
}

interface ConnectResponse {
  base64?: string;
  code?: string;
  pairingCode?: string | null;
  qrcode?: { base64?: string; pairingCode?: string | null };
}

/** Evolution API v2 client behind the WhatsAppProvider interface. */
export class EvolutionService implements WhatsAppProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor(opts?: { baseUrl?: string; apiKey?: string }) {
    this.baseUrl = (opts?.baseUrl ?? process.env.EVOLUTION_API_URL ?? "http://localhost:8080").replace(/\/$/, "");
    this.apiKey = opts?.apiKey ?? process.env.EVOLUTION_API_KEY ?? "";
  }

  isConfigured(): boolean {
    return this.baseUrl.length > 0 && this.apiKey.length > 0;
  }

  private headers(): Record<string, string> {
    return { "Content-Type": "application/json", apikey: this.apiKey };
  }

  private async req(path: string, init?: RequestInit): Promise<unknown> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: { ...this.headers(), ...((init?.headers as object) ?? {}) },
        signal: ctrl.signal,
      });
      const text = await res.text().catch(() => "");
      let json: unknown = text;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        /* keep raw text */
      }
      if (!res.ok) {
        throw new EvolutionError(res.status, path, String(text));
      }
      return json;
    } finally {
      clearTimeout(t);
    }
  }

  async createInstance(name: string) {
    logger.info("whatsapp.create_instance", { name });
    let created: CreateResponse | null = null;
    try {
      created = (await this.req("/instance/create", {
        method: "POST",
        body: JSON.stringify({ instanceName: name, qrcode: true, integration: "WHATSAPP-BAILEYS" }),
      })) as CreateResponse;
    } catch (err) {
      if (err instanceof EvolutionError && err.status === 409) {
        // Instance already exists — fall through and fetch a fresh QR.
        logger.info("whatsapp.instance_exists", { name });
      } else {
        throw err;
      }
    }
    let qr = created?.qrcode?.base64 ?? null;
    let pairingCode = created?.qrcode?.pairingCode ?? created?.pairingCode ?? null;
    if (!qr) {
      const connected = await this.connectInstance(name);
      qr = connected.qr;
      pairingCode = connected.pairingCode ?? pairingCode;
    }
    return {
      qr,
      pairingCode,
      status: qr ? "QR_REQUIRED" : mapInstanceStatus(created?.instance?.status),
      raw: created,
    };
  }

  /** Fetch a fresh QR / pairing code for an existing instance. */
  async connectInstance(name: string): Promise<{ qr: string | null; pairingCode: string | null; raw?: unknown }> {
    const json = (await this.req(`/instance/connect/${encodeURIComponent(name)}`, {
      method: "GET",
    })) as ConnectResponse;
    return {
      qr: json?.base64 ?? json?.qrcode?.base64 ?? null,
      pairingCode: json?.pairingCode ?? json?.qrcode?.pairingCode ?? null,
      raw: json,
    };
  }

  async getStatus(name: string) {
    try {
      const json = (await this.req(`/instance/connectionState/${encodeURIComponent(name)}`, {
        method: "GET",
      })) as { instance?: { state?: string; status?: string }; state?: string; status?: string; number?: string };
      const raw = json?.instance?.state ?? json?.state ?? json?.status ?? "unknown";
      const status = normalizeState(String(raw));
      return { status, phone: (json as { number?: string })?.number, raw: json };
    } catch (err) {
      if (err instanceof EvolutionError && err.status === 404) {
        // Instance simply doesn't exist yet — not an error worth alerting on.
        logger.debug("whatsapp.instance_missing", { name });
        return { status: "DISCONNECTED", raw: null };
      }
      logger.warn("whatsapp.status_failed", { name, error: (err as Error).message });
      return { status: "DISCONNECTED", raw: null };
    }
  }

  async sendText(name: string, phone: string, text: string): Promise<SendTextResult> {
    // Evolution expects JID-ish number (digits only, with country code)
    const number = phone.replace(/\D/g, "");
    const json = (await this.req(`/message/sendText/${encodeURIComponent(name)}`, {
      method: "POST",
      body: JSON.stringify({ number, text, delay: 1200 }),
    })) as { key?: { id?: string }; messageID?: string; id?: string };
    const externalId = json?.key?.id ?? json?.messageID ?? json?.id ?? `local-${Date.now()}`;
    logger.info("whatsapp.sent", { instance: name, phone: maskPhone(number), externalId });
    return { externalId: String(externalId), status: "SENT", raw: json };
  }

  async disconnect(name: string): Promise<void> {
    try {
      await this.req(`/instance/logout/${encodeURIComponent(name)}`, { method: "DELETE" });
    } catch (err) {
      if (err instanceof EvolutionError && err.status === 404) return; // already gone
      throw err;
    }
    logger.info("whatsapp.disconnected", { name });
  }

  async logout(name: string): Promise<void> {
    await this.disconnect(name);
  }
}

function mapInstanceStatus(s: string | undefined): string {
  if (!s) return "CONNECTING";
  return normalizeState(s);
}

function normalizeState(s: string): string {
  const v = s.toLowerCase();
  if (v.includes("open") || v.includes("connected")) return "CONNECTED";
  if (v.includes("qr") || v.includes("qrcode")) return "QR_REQUIRED";
  if (v.includes("connecting")) return "CONNECTING";
  if (v.includes("close") || v.includes("disconnect")) return "DISCONNECTED";
  return "DISCONNECTED";
}

function maskPhone(p: string): string {
  return p.length > 4 ? `${p.slice(0, 2)}****${p.slice(-2)}` : "****";
}

export const whatsappService: WhatsAppProvider = new EvolutionService();
