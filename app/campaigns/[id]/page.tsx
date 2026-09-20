"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";

interface Message {
  id: string;
  phone: string;
  status: string;
  generatedBody: string | null;
  finalBody: string | null;
  contact: { name: string; businessName: string; businessWork: string };
}

const ACTION_LABELS: Record<string, string> = {
  generate: "Generate messages",
  "approve-all": "Approve all",
  approve: "Approve campaign",
  start: "Launch campaign",
  pause: "Pause",
  resume: "Resume",
  cancel: "Cancel",
};

const ACTION_LOADING_LABELS: Record<string, string> = {
  generate: "Generating…",
  "approve-all": "Approving all…",
  approve: "Approving…",
  start: "Launching…",
  pause: "Pausing…",
  resume: "Resuming…",
  cancel: "Cancelling…",
};

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [campaign, setCampaign] = useState<{ name: string; status: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [pageLoading, setPageLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const busy = pendingAction !== null;

  async function load(initial = false) {
    if (initial) setPageLoading(true);
    try {
      const [c, m] = await Promise.all([
        fetch(`/api/campaigns/${id}`).then((r) => r.json()).catch(() => null),
        fetch(`/api/campaigns/${id}/messages?pageSize=50`).then((r) => r.json()).catch(() => null),
      ]);
      if (c?.campaign) setCampaign(c.campaign);
      if (m?.messages) setMessages(m.messages);
    } finally {
      if (initial) setPageLoading(false);
    }
  }

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function act(path: string, key: string, method = "POST", body?: object) {
    setPendingAction(key);
    setActionError(null);
    try {
      const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setActionError(j?.error?.message ?? "Action failed");
      }
    } catch {
      setActionError("Network error — please retry");
    } finally {
      setPendingAction(null);
      await load(false);
    }
  }

  async function saveEdit(mid: string) {
    const text = editing[mid];
    if (!text) return;
    await act(`/api/messages/${mid}`, `save:${mid}`, "PATCH", { finalBody: text });
  }

  function campaignButton(key: keyof typeof ACTION_LABELS, path: string, variant: "default" | "secondary" | "outline" | "destructive" = "outline", disabledReason?: string | null) {
    const disabled = busy || !!disabledReason;
    return (
      <Button variant={variant} disabled={disabled} title={disabledReason ?? undefined} onClick={() => void act(path, key)}>
        {pendingAction === key ? ACTION_LOADING_LABELS[key] : ACTION_LABELS[key]}
      </Button>
    );
  }

  const status = campaign?.status ?? "";
  const isTerminal = status === "CANCELLED" || status === "COMPLETED";

  if (pageLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Campaign</h1>
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading campaign…</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{campaign?.name ?? "Campaign"}</h1>
        {campaign && <StatusBadge status={campaign.status} />}
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => void load(false)}>
          {pendingAction === "refresh" ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
      {actionError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</p>
      )}
      <Card>
        <CardHeader><CardTitle>Controls</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {campaignButton("generate", `/api/campaigns/${id}/generate`, "secondary", isTerminal ? `Cannot generate when ${status}` : null)}
          {campaignButton("approve-all", `/api/campaigns/${id}/approve-all`, "outline", isTerminal ? `Cannot approve when ${status}` : null)}
          {campaignButton("approve", `/api/campaigns/${id}/approve`, "outline", status !== "READY_FOR_REVIEW" ? (campaign ? `Approve needs READY_FOR_REVIEW (now ${status})` : null) : null)}
          {campaignButton("start", `/api/campaigns/${id}/start`, "default", status !== "APPROVED" ? (campaign ? `Launch needs APPROVED (now ${status})` : null) : null)}
          {campaignButton("pause", `/api/campaigns/${id}/pause`, "outline", status !== "RUNNING" ? (campaign ? `Pause needs RUNNING (now ${status})` : null) : null)}
          {campaignButton("resume", `/api/campaigns/${id}/resume`, "outline", status !== "PAUSED" ? (campaign ? `Resume needs PAUSED (now ${status})` : null) : null)}
          {campaignButton("cancel", `/api/campaigns/${id}/cancel`, "destructive", isTerminal ? `Already ${status}` : null)}
        </CardContent>
      </Card>
      <div className="grid gap-4">
        {messages.map((m) => {
          const saveKey = `save:${m.id}`;
          const regenKey = `regen:${m.id}`;
          const approveKey = `approve-msg:${m.id}`;
          const rejectKey = `reject-msg:${m.id}`;
          const msgBusy = pendingAction === saveKey || pendingAction === regenKey || pendingAction === approveKey || pendingAction === rejectKey;
          return (
            <Card key={m.id}>
              <CardHeader>
                <CardTitle className="text-base">{m.contact.name} — {m.contact.businessName} <span className="text-sm font-normal text-muted-foreground">({m.contact.businessWork} · {m.phone})</span></CardTitle>
                <StatusBadge status={m.status} className="w-fit" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  defaultValue={m.finalBody ?? m.generatedBody ?? ""}
                  rows={4}
                  onChange={(e) => setEditing((s) => ({ ...s, [m.id]: e.target.value }))}
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => void saveEdit(m.id)}>{pendingAction === saveKey ? "Saving…" : "Save edit"}</Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => void act(`/api/messages/${m.id}/regenerate`, regenKey)}>{pendingAction === regenKey ? "Regenerating…" : "Regenerate"}</Button>
                  <Button size="sm" disabled={busy || msgBusy} onClick={() => void act(`/api/messages/${m.id}`, approveKey, "PATCH", { status: "APPROVED" })}>{pendingAction === approveKey ? "Approving…" : "Approve"}</Button>
                  <Button size="sm" variant="destructive" disabled={busy} onClick={() => void act(`/api/messages/${m.id}`, rejectKey, "PATCH", { status: "REJECTED" })}>{pendingAction === rejectKey ? "Rejecting…" : "Reject"}</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet — click “Generate messages”.</p>}
      </div>
    </div>
  );
}
