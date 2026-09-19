"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  phone: string;
  status: string;
  generatedBody: string | null;
  finalBody: string | null;
  contact: { name: string; businessName: string; businessWork: string };
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [campaign, setCampaign] = useState<{ name: string; status: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [editing, setEditing] = useState<Record<string, string>>({});

  async function load() {
    const [c, m] = await Promise.all([
      fetch(`/api/campaigns/${id}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/campaigns/${id}/messages?pageSize=50`).then((r) => r.json()).catch(() => null),
    ]);
    if (c?.campaign) setCampaign(c.campaign);
    if (m?.messages) setMessages(m.messages);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function act(path: string, method = "POST", body?: object) {
    const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      alert(j?.error?.message ?? "Action failed");
    }
    void load();
  }

  async function saveEdit(mid: string) {
    const text = editing[mid];
    if (!text) return;
    await act(`/api/messages/${mid}`, "PATCH", { finalBody: text });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{campaign?.name ?? "Campaign"}</h1>
        {campaign && <Badge>{campaign.status}</Badge>}
      </div>
      <Card>
        <CardHeader><CardTitle>Controls</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void act(`/api/campaigns/${id}/generate`)}>Generate messages</Button>
          <Button variant="outline" onClick={() => void act(`/api/campaigns/${id}/approve-all`)}>Approve all</Button>
          <Button variant="outline" onClick={() => void act(`/api/campaigns/${id}/approve`)}>Approve campaign</Button>
          <Button onClick={() => void act(`/api/campaigns/${id}/start`)}>Launch campaign</Button>
          <Button variant="outline" onClick={() => void act(`/api/campaigns/${id}/pause`)}>Pause</Button>
          <Button variant="outline" onClick={() => void act(`/api/campaigns/${id}/resume`)}>Resume</Button>
          <Button variant="destructive" onClick={() => void act(`/api/campaigns/${id}/cancel`)}>Cancel</Button>
        </CardContent>
      </Card>
      <div className="grid gap-4">
        {messages.map((m) => (
          <Card key={m.id}>
            <CardHeader>
              <CardTitle className="text-base">{m.contact.name} — {m.contact.businessName} <span className="text-sm font-normal text-muted-foreground">({m.contact.businessWork} · {m.phone})</span></CardTitle>
              <Badge variant="secondary" className="w-fit">{m.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                defaultValue={m.finalBody ?? m.generatedBody ?? ""}
                rows={4}
                onChange={(e) => setEditing((s) => ({ ...s, [m.id]: e.target.value }))}
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void saveEdit(m.id)}>Save edit</Button>
                <Button size="sm" variant="outline" onClick={() => void act(`/api/messages/${m.id}/regenerate`)}>Regenerate</Button>
                <Button size="sm" onClick={() => void act(`/api/messages/${m.id}`, "PATCH", { status: "APPROVED" })}>Approve</Button>
                <Button size="sm" variant="destructive" onClick={() => void act(`/api/messages/${m.id}`, "PATCH", { status: "REJECTED" })}>Reject</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet — click “Generate messages”.</p>}
      </div>
    </div>
  );
}
