"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";

interface Campaign {
  id: string;
  name: string;
  status: string;
  totalContacts: number;
  sentCount: number;
  failedCount: number;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({ name: "", objective: "", tone: "Professional and friendly", language: "English", cta: "" });

  async function load() {
    const [c, ct] = await Promise.all([
      fetch("/api/campaigns").then((r) => r.json()).catch(() => null),
      fetch("/api/contacts?pageSize=100").then((r) => r.json()).catch(() => null),
    ]);
    if (c?.campaigns) setCampaigns(c.campaigns);
    if (ct?.contacts) setContacts(ct.contacts);
  }

  useEffect(() => {
    void load();
  }, []);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function create() {
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, description: "", contactIds: selected }),
    });
    if (res.ok) {
      setForm({ name: "", objective: "", tone: "Professional and friendly", language: "English", cta: "" });
      setSelected([]);
      void load();
    } else {
      const j = await res.json().catch(() => null);
      alert(j?.error?.message ?? "Failed to create campaign");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Campaigns</h1>
      <Card>
        <CardHeader><CardTitle>Create campaign</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label>Campaign name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Language</Label><Input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Objective</Label><Textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Offer website development services…" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label>Tone</Label><Input value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Call to action</Label><Input value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} placeholder="Would you be open to a quick call?" /></div>
          </div>
          <div className="space-y-2">
            <Label>Target contacts ({selected.length} selected)</Label>
            <div className="max-h-48 overflow-auto rounded border p-2 text-sm">
              {contacts.map((c) => (
                <label key={c.id} className="flex items-center gap-2 py-1">
                  <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
                  {c.name} — {c.phone}
                </label>
              ))}
              {contacts.length === 0 && <p className="text-muted-foreground">Import contacts first.</p>}
            </div>
          </div>
          <Button onClick={create} disabled={!form.name || !form.objective || selected.length === 0}>Create campaign</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>All campaigns</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {campaigns.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <span><Link href={`/campaigns/${c.id}`} className="font-medium underline">{c.name}</Link> <StatusBadge status={c.status} /></span>
                <span className="text-muted-foreground">Contacts {c.totalContacts} · Sent {c.sentCount} · Failed {c.failedCount}</span>
              </li>
            ))}
            {campaigns.length === 0 && <p className="text-muted-foreground">No campaigns yet.</p>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
