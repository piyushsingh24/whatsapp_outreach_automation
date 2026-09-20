"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";

export default function WhatsAppPage() {
  const [instances, setInstances] = useState<Array<{ name: string; status: string; phone?: string; qrCode?: string }>>([]);
  const [name, setName] = useState("business-01");
  const [qr, setQr] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setStatusLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/whatsapp/status?name=${encodeURIComponent(name)}`);
      if (res.ok) {
        const j = await res.json();
        setInstances(j.instances ?? []);
      }
    } finally {
      setStatusLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect() {
    if (connecting) return;
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const j = await res.json().catch(() => null);
      if (res.ok) {
        setQr(j.qr ?? null);
        await load();
      } else setError(j?.error?.message ?? "Connect failed");
    } catch {
      setError("Network error — please retry");
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (disconnecting) return;
    setDisconnecting(true);
    setError(null);
    try {
      await fetch("/api/whatsapp/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setQr(null);
      await load();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">WhatsApp</h1>
      <Card>
        <CardHeader><CardTitle>Connect instance</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="business-01" />
            <Button onClick={connect} disabled={connecting || disconnecting}>{connecting ? "Connecting…" : "Connect"}</Button>
            <Button variant="outline" onClick={disconnect} disabled={connecting || disconnecting}>{disconnecting ? "Disconnecting…" : "Disconnect"}</Button>
            <Button variant="ghost" onClick={() => void load()} disabled={statusLoading}>{statusLoading ? "Refreshing…" : "Refresh"}</Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {qr && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Scan this QR in WhatsApp → Linked devices:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`} alt="WhatsApp QR" className="h-64 w-64 border" />
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Instances {statusLoading && <span className="text-sm font-normal text-muted-foreground">(loading…)</span>}</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {instances.map((i) => (
              <li key={i.name} className="flex justify-between py-2">
                <span>{i.name} {i.phone && <span className="text-muted-foreground">· {i.phone}</span>}</span>
                <StatusBadge status={i.status} />
              </li>
            ))}
            {instances.length === 0 && !statusLoading && <p className="text-muted-foreground">No instances yet.</p>}
            {statusLoading && instances.length === 0 && <p className="text-muted-foreground">Loading instances…</p>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
