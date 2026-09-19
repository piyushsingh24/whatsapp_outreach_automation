/** WhatsApp provider abstraction — app code depends on this. */
export interface SendTextResult {
  externalId: string;
  status: "SENT" | "QUEUED";
  raw?: unknown;
}

export interface WhatsAppProvider {
  isConfigured(): boolean;
  createInstance(name: string): Promise<{ qr: string | null; pairingCode: string | null; status: string; raw?: unknown }>;
  /** Fetch a fresh QR / pairing code for an existing instance. */
  connectInstance(name: string): Promise<{ qr: string | null; pairingCode: string | null; raw?: unknown }>;
  getStatus(name: string): Promise<{ status: string; phone?: string; qr?: string; raw?: unknown }>;
  sendText(name: string, phone: string, text: string): Promise<SendTextResult>;
  disconnect(name: string): Promise<void>;
  logout(name: string): Promise<void>;
}
