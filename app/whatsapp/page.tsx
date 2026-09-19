"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function WhatsAppPage() {
  const [instances, setInstances] = useState<Array<{ name: string; status: string; phone?: string; qrCode?: string }>>([]);
  const [name, setName] = useState("business-01");
  const [qr, setQr] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/whatsapp/status?name=${encodeURIComponent(name)}`);
    if (res.ok) {
      const j = await res.json();
      setInstances(j.instances ?? []);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect() {
    const res = await fetch("/api/whatsapp/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const j = await res.json().catch(() => null);
    if (res.ok) {
      setQr(j.qr ?? null);
      void load();
    } else alert(j?.error?.message ?? "Connect failed");
  }

  async function disconnect() {
    await fetch("/api/whatsapp/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setQr(null);
    void load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">WhatsApp</h1>
      <Card>
        <CardHeader><CardTitle>Connect instance</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="business-01" />
            <Button onClick={connect}>Connect</Button>
            <Button variant="outline" onClick={disconnect}>Disconnect</Button>
            <Button variant="ghost" onClick={() => void load()}>Refresh</Button>
          </div>
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
        <CardHeader><CardTitle>Instances</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {instances.map((i) => (
              <li key={i.name} className="flex justify-between py-2">
                <span>{i.name} {i.phone && <span className="text-muted-foreground">· {i.phone}</span>}</span>
                <Badge>{i.status}</Badge>
              </li>
            ))}
            {instances.length === 0 && <p className="text-muted-foreground">No instances yet.</p>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
