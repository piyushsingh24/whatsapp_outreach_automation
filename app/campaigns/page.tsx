"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";

interface Campaign {
  id: string;
  name: string;
  status: string;
  totalContacts: number;
  sentCount: number;
  failedCount: number;
}

interface TargetContact {
  id: string;
  name: string;
  phone: string;
  groups?: Array<{ group: { id: string; name: string } }>;
}

interface Group {
  id: string;
  name: string;
  memberCount: number;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<TargetContact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupFilter, setGroupFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({ name: "", objective: "", tone: "Professional and friendly", language: "English", cta: "" });
  const [pageLoading, setPageLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectingGroup, setSelectingGroup] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setPageLoading(true);
    try {
      const [c, ct, g] = await Promise.all([
        fetch("/api/campaigns").then((r) => r.json()).catch(() => null),
        fetch("/api/contacts?pageSize=100").then((r) => r.json()).catch(() => null),
        fetch("/api/contact-groups").then((r) => r.json()).catch(() => null),
      ]);
      if (c?.campaigns) setCampaigns(c.campaigns);
      if (ct?.contacts) setContacts(ct.contacts);
      if (g?.groups) setGroups(g.groups);
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function selectGroup(groupId: string) {
    if (!groupId || selectingGroup) return;
    setSelectingGroup(true);
    try {
      const res = await fetch(`/api/contacts?groupId=${encodeURIComponent(groupId)}&pageSize=100`).then((r) => r.json()).catch(() => null);
      const ids: string[] = (res?.contacts as TargetContact[] | undefined)?.map((c) => c.id) ?? [];
      if (ids.length > 0) {
        setContacts((prev) => {
          const existing = new Set(prev.map((c) => c.id));
          const merged = [...prev];
          for (const c of (res.contacts as TargetContact[])) {
            if (!existing.has(c.id)) merged.push(c);
          }
          return merged;
        });
        setSelected((s) => Array.from(new Set([...s, ...ids])));
      }
    } finally {
      setSelectingGroup(false);
    }
  }

  function selectFiltered() {
    const ids = filtered.map((c) => c.id);
    setSelected((s) => Array.from(new Set([...s, ...ids])));
  }

  async function create() {
    if (creating) return;
    setCreating(true);
    setFormError(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, description: "", contactIds: selected }),
      });
      if (res.ok) {
        setForm({ name: "", objective: "", tone: "Professional and friendly", language: "English", cta: "" });
        setSelected([]);
        await load();
      } else {
        const j = await res.json().catch(() => null);
        setFormError(j?.error?.message ?? "Failed to create campaign");
      }
    } catch {
      setFormError("Network error — please retry");
    } finally {
      setCreating(false);
    }
  }

  const filtered = groupFilter
    ? contacts.filter((c) => (c.groups ?? []).some(({ group }) => group.id === groupFilter))
    : contacts;

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
            <div className="flex flex-wrap gap-2">
              <Select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="max-w-xs">
                <option value="">All groups</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name} ({g.memberCount})</option>
                ))}
              </Select>
              <Button size="sm" variant="outline" onClick={() => void selectGroup(groupFilter)} disabled={!groupFilter || selectingGroup}>{selectingGroup ? "Selecting…" : "Select entire group"}</Button>
              <Button size="sm" variant="outline" onClick={selectFiltered} disabled={filtered.length === 0}>Select filtered ({filtered.length})</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])} disabled={selected.length === 0}>Clear</Button>
            </div>
            <div className="max-h-48 overflow-auto rounded border p-2 text-sm">
              {filtered.map((c) => (
                <label key={c.id} className="flex items-center gap-2 py-1">
                  <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
                  <span>{c.name} — {c.phone}</span>
                  {(c.groups ?? []).map(({ group }) => (
                    <Badge key={group.id} variant="secondary">{group.name}</Badge>
                  ))}
                </label>
              ))}
              {filtered.length === 0 && <p className="text-muted-foreground">Import contacts first.</p>}
            </div>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button onClick={create} disabled={creating || pageLoading || !form.name || !form.objective || selected.length === 0}>{creating ? "Creating…" : "Create campaign"}</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>All campaigns {pageLoading && <span className="text-sm font-normal text-muted-foreground">(loading…)</span>}</CardTitle></CardHeader>
        <CardContent>
          {pageLoading && campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading campaigns…</p>
          ) : (
          <ul className="divide-y text-sm">
            {campaigns.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <span><Link href={`/campaigns/${c.id}`} className="font-medium underline">{c.name}</Link> <StatusBadge status={c.status} /></span>
                <span className="text-muted-foreground">Contacts {c.totalContacts} · Sent {c.sentCount} · Failed {c.failedCount}</span>
              </li>
            ))}
            {campaigns.length === 0 && <p className="text-muted-foreground">No campaigns yet.</p>}
          </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
