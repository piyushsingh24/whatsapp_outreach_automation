"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function MessagesPage() {
  const [campaignId, setCampaignId] = useState("");
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([]);
  const [messages, setMessages] = useState<Array<{ id: string; phone: string; status: string; finalBody: string | null }>>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    setCampaignsLoading(true);
    fetch("/api/campaigns").then((r) => r.json()).then((j) => {
      setCampaigns(j.campaigns ?? []);
      if (j.campaigns?.[0]) setCampaignId(j.campaigns[0].id);
    }).catch(() => undefined).finally(() => setCampaignsLoading(false));
  }, []);

  async function load() {
    if (!campaignId || messagesLoading) return;
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/messages?pageSize=50`);
      if (res.ok) {
        const j = await res.json();
        setMessages(j.messages);
      }
    } finally {
      setMessagesLoading(false);
    }
  }

  useEffect(() => {
    if (campaignId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Messages</h1>
      <Card>
        <CardHeader><CardTitle>Message history</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <select className="h-9 rounded-md border px-3 text-sm" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} disabled={campaignsLoading}>
              {campaigns.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <Button variant="outline" onClick={() => void load()} disabled={messagesLoading || !campaignId}>{messagesLoading ? "Loading…" : "Refresh"}</Button>
          </div>
          {campaignsLoading && <p className="text-sm text-muted-foreground">Loading campaigns…</p>}
          <Table>
            <TableHeader><TableRow><TableHead>Phone</TableHead><TableHead>Status</TableHead><TableHead>Message</TableHead></TableRow></TableHeader>
            <TableBody>
              {messages.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.phone}</TableCell>
                  <TableCell><StatusBadge status={m.status} /></TableCell>
                  <TableCell className="max-w-md truncate">{m.finalBody ?? "—"}</TableCell>
                </TableRow>
              ))}
              {messages.length === 0 && !messagesLoading && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Select a campaign to view messages.</TableCell></TableRow>}
              {messagesLoading && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Loading messages…</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
