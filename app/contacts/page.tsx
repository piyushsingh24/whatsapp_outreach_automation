"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";

interface GroupRef {
  id: string;
  name: string;
  color?: string | null;
}

interface Contact {
  id: string;
  name: string;
  businessName: string;
  phone: string;
  businessWork: string;
  status: string;
  groups?: Array<{ group: GroupRef }>;
}

interface Group {
  id: string;
  name: string;
  color?: string | null;
  memberCount: number;
}

const EMPTY_ROW = { name: "", businessName: "", phone: "", businessWork: "" };

function parsePaste(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[,;\t|]/).map((p) => p.trim());
      return {
        name: parts[0] ?? "",
        businessName: parts[1] ?? "",
        phone: (parts[2] ?? "").replace(/[\s\-()+]/g, ""),
        businessWork: parts[3] ?? "",
      };
    })
    .filter((r) => r.name || r.phone);
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [importGroupId, setImportGroupId] = useState("");
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  // manual single
  const [manualTab, setManualTab] = useState<"single" | "bulk">("single");
  const [single, setSingle] = useState(EMPTY_ROW);
  const [singleGroups, setSingleGroups] = useState<string[]>([]);
  const [manualMsg, setManualMsg] = useState<string | null>(null);
  const [manualLoading, setManualLoading] = useState(false);

  // manual bulk
  const [bulkRows, setBulkRows] = useState([ { ...EMPTY_ROW }, { ...EMPTY_ROW }, { ...EMPTY_ROW } ]);
  const [bulkPaste, setBulkPaste] = useState("");
  const [bulkGroups, setBulkGroups] = useState<string[]>([]);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // groups
  const [newGroupName, setNewGroupName] = useState("");
  const [groupMsg, setGroupMsg] = useState<string | null>(null);
  const [assignGroupId, setAssignGroupId] = useState("");
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  async function loadGroups() {
    setGroupsLoading(true);
    try {
      const res = await fetch("/api/contact-groups");
      if (res.ok) {
        const j = await res.json();
        setGroups(j.groups ?? []);
      }
    } finally {
      setGroupsLoading(false);
    }
  }

  async function load() {
    setListLoading(true);
    try {
      const params = new URLSearchParams({ search, pageSize: "50" });
      if (groupFilter) params.set("groupId", groupFilter);
      const res = await fetch(`/api/contacts?${params.toString()}`);
      if (res.ok) {
        const j = await res.json();
        setContacts(j.contacts);
        setTotal(j.total);
      }
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    void load();
    void loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupFilter]);

  function toggleGroupSelection(list: string[], id: string, set: (v: string[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function toggleSelect(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function toggleSelectAllVisible() {
    const ids = contacts.map((c) => c.id);
    const allSelected = ids.length > 0 && ids.every((id) => selected.includes(id));
    setSelected(allSelected ? selected.filter((id) => !ids.includes(id)) : Array.from(new Set([...selected, ...ids])));
  }

  async function selectAllInGroup() {
    if (!groupFilter) {
      toggleSelectAllVisible();
      return;
    }
    if (selectingAll) return;
    setSelectingAll(true);
    try {
      // fetch all ids in group (up to 500 for selection purposes)
      const res = await fetch(`/api/contacts?groupId=${encodeURIComponent(groupFilter)}&pageSize=100`);
      if (res.ok) {
        const j = await res.json();
        const ids = (j.contacts as Contact[]).map((c) => c.id);
        setSelected(Array.from(new Set([...selected, ...ids])));
      }
    } finally {
      setSelectingAll(false);
    }
  }

  async function upload() {
    if (!file) return;
    setLoading(true);
    setSummary(null);
    const form = new FormData();
    form.append("file", file);
    if (importGroupId) form.append("groupId", importGroupId);
    const res = await fetch("/api/contacts/import", { method: "POST", body: form });
    const j = await res.json();
    setLoading(false);
    if (res.ok) {
      setSummary(j.summary);
      void load();
      void loadGroups();
    } else {
      setSummary({ error: j?.error?.message ?? "Import failed" });
    }
  }

  async function addSingle() {
    setManualLoading(true);
    setManualMsg(null);
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...single, groupIds: singleGroups }),
    });
    const j = await res.json().catch(() => null);
    setManualLoading(false);
    if (res.ok) {
      setManualMsg("Contact added.");
      setSingle({ ...EMPTY_ROW });
      setSingleGroups([]);
      void load();
      void loadGroups();
    } else {
      setManualMsg(j?.error?.message ?? "Failed to add contact");
    }
  }

  function updateBulkRow(i: number, key: keyof typeof EMPTY_ROW, value: string) {
    setBulkRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }

  async function addBulk() {
    setBulkLoading(true);
    setBulkMsg(null);
    let rows = bulkRows.filter((r) => r.name.trim() || r.phone.trim());
    const pasted = parsePaste(bulkPaste);
    rows = [...rows, ...pasted];
    if (rows.length === 0) {
      setBulkMsg("Add at least one row or paste lines.");
      setBulkLoading(false);
      return;
    }
    const res = await fetch("/api/contacts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contacts: rows.map((r) => ({ ...r, phone: r.phone.replace(/[\s\-()+]/g, ""), groupIds: bulkGroups })),
      }),
    });
    const j = await res.json().catch(() => null);
    setBulkLoading(false);
    if (res.ok) {
      setBulkMsg(`Imported ${j.importedRows}/${j.totalRows}. Duplicates: ${j.duplicateRows}. ${j.errors?.length ? `First error: ${j.errors[0].error}` : ""}`);
      setBulkRows([{ ...EMPTY_ROW }, { ...EMPTY_ROW }, { ...EMPTY_ROW }]);
      setBulkPaste("");
      setBulkGroups([]);
      void load();
      void loadGroups();
    } else {
      const detail = j?.error?.details ? JSON.stringify(j.error.details) : "";
      setBulkMsg(`${j?.error?.message ?? "Bulk add failed"} ${detail}`.trim());
    }
  }

  async function createGroup() {
    if (!newGroupName.trim() || creatingGroup) return;
    setCreatingGroup(true);
    setGroupMsg(null);
    try {
      const res = await fetch("/api/contact-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      const j = await res.json().catch(() => null);
      if (res.ok) {
        setNewGroupName("");
        await loadGroups();
      } else {
        setGroupMsg(j?.error?.message ?? "Failed to create group");
      }
    } finally {
      setCreatingGroup(false);
    }
  }

  async function deleteGroup(id: string) {
    if (!confirm("Delete this group? Contacts stay, only grouping is removed.")) return;
    setDeletingGroupId(id);
    try {
      const res = await fetch(`/api/contact-groups/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (groupFilter === id) setGroupFilter("");
        await loadGroups();
        await load();
      }
    } finally {
      setDeletingGroupId(null);
    }
  }

  async function bulkAssign() {
    if (!assignGroupId || selected.length === 0 || bulkActionLoading) return;
    setBulkActionLoading(true);
    try {
      const res = await fetch("/api/contacts/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: selected, groupIds: [assignGroupId] }),
      });
      if (res.ok) {
        setSelected([]);
        await load();
        await loadGroups();
      }
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function bulkDelete() {
    if (selected.length === 0 || bulkActionLoading) return;
    if (!confirm(`Delete ${selected.length} selected contacts?`)) return;
    setBulkActionLoading(true);
    try {
      const res = await fetch("/api/contacts/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: selected }),
      });
      if (res.ok) {
        setSelected([]);
        await load();
        await loadGroups();
      }
    } finally {
      setBulkActionLoading(false);
    }
  }

  const visibleIds = contacts.map((c) => c.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Contacts</h1>

      <Card>
        <CardHeader><CardTitle>Import Excel / CSV</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Columns required: Name, Business Name, Phone Number, Business Work (.xlsx, .xls, .csv — max 10 MB)
          </p>
          <div className="flex flex-wrap gap-2">
            <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Select value={importGroupId} onChange={(e) => setImportGroupId(e.target.value)} className="max-w-xs">
              <option value="">No group (optional)</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>Import into: {g.name}</option>
              ))}
            </Select>
            <Button onClick={upload} disabled={!file || loading}>{loading ? "Importing…" : "Upload"}</Button>
          </div>
          {summary && <pre className="overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(summary, null, 2)}</pre>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Add contact manually</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant={manualTab === "single" ? "default" : "outline"} size="sm" onClick={() => setManualTab("single")}>Single</Button>
            <Button variant={manualTab === "bulk" ? "default" : "outline"} size="sm" onClick={() => setManualTab("bulk")}>Bulk add / paste</Button>
          </div>

          {manualTab === "single" ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Name</Label><Input value={single.name} onChange={(e) => setSingle({ ...single, name: e.target.value })} placeholder="Rahul Sharma" /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={single.phone} onChange={(e) => setSingle({ ...single, phone: e.target.value })} placeholder="919876543210" /></div>
                <div className="space-y-2"><Label>Business Name</Label><Input value={single.businessName} onChange={(e) => setSingle({ ...single, businessName: e.target.value })} placeholder="Sharma Interiors" /></div>
                <div className="space-y-2"><Label>Business Work</Label><Input value={single.businessWork} onChange={(e) => setSingle({ ...single, businessWork: e.target.value })} placeholder="Interior design" /></div>
              </div>
              <div className="space-y-2">
                <Label>Groups (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {groups.map((g) => (
                    <label key={g.id} className="flex items-center gap-1 rounded border px-2 py-1 text-xs">
                      <input type="checkbox" checked={singleGroups.includes(g.id)} onChange={() => toggleGroupSelection(singleGroups, g.id, setSingleGroups)} />
                      {g.name}
                    </label>
                  ))}
                  {groups.length === 0 && <span className="text-xs text-muted-foreground">Create a group below first, or add without group.</span>}
                </div>
              </div>
              <Button onClick={addSingle} disabled={manualLoading || !single.name.trim() || !single.phone.trim() || !single.businessName.trim() || !single.businessWork.trim()}>
                {manualLoading ? "Adding…" : "Add contact"}
              </Button>
              {manualMsg && <p className="text-sm text-muted-foreground">{manualMsg}</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {bulkRows.map((r, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-4">
                  <Input placeholder={`Name #${i + 1}`} value={r.name} onChange={(e) => updateBulkRow(i, "name", e.target.value)} />
                  <Input placeholder="Business" value={r.businessName} onChange={(e) => updateBulkRow(i, "businessName", e.target.value)} />
                  <Input placeholder="Phone" value={r.phone} onChange={(e) => updateBulkRow(i, "phone", e.target.value)} />
                  <div className="flex gap-2">
                    <Input placeholder="Work" value={r.businessWork} onChange={(e) => updateBulkRow(i, "businessWork", e.target.value)} />
                    <Button variant="outline" size="sm" onClick={() => setBulkRows((rows) => rows.filter((_, idx) => idx !== i))}>✕</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setBulkRows((rows) => [...rows, { ...EMPTY_ROW }])}>+ Add row</Button>
              <div className="space-y-2">
                <Label>Paste many at once (one per line: Name, Business, Phone, Work)</Label>
                <Textarea rows={4} value={bulkPaste} onChange={(e) => setBulkPaste(e.target.value)} placeholder={"Asha, Asha Boutique, 919111111111, Clothing\nVikram, Vikram Foods, 919222222222, Restaurant"} />
              </div>
              <div className="space-y-2">
                <Label>Groups for all these contacts (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {groups.map((g) => (
                    <label key={g.id} className="flex items-center gap-1 rounded border px-2 py-1 text-xs">
                      <input type="checkbox" checked={bulkGroups.includes(g.id)} onChange={() => toggleGroupSelection(bulkGroups, g.id, setBulkGroups)} />
                      {g.name}
                    </label>
                  ))}
                  {groups.length === 0 && <span className="text-xs text-muted-foreground">No groups yet.</span>}
                </div>
              </div>
              <Button onClick={addBulk} disabled={bulkLoading}>{bulkLoading ? "Adding…" : "Add bulk contacts"}</Button>
              {bulkMsg && <p className="text-sm text-muted-foreground">{bulkMsg}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Groups ({groups.length}) {groupsLoading && <span className="text-sm font-normal text-muted-foreground">(loading…)</span>}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="New group name, e.g. Jewellers - Jaipur" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
            <Button variant="outline" onClick={createGroup} disabled={!newGroupName.trim() || creatingGroup}>{creatingGroup ? "Creating…" : "Create group"}</Button>
          </div>
          {groupMsg && <p className="text-sm text-destructive">{groupMsg}</p>}
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <span key={g.id} className="flex items-center gap-2 rounded border px-2 py-1 text-xs">
                <button className="font-medium underline" onClick={() => setGroupFilter(g.id)} title="Filter contacts by this group">
                  {g.name} ({g.memberCount})
                </button>
                <button className="text-muted-foreground hover:text-destructive" onClick={() => void deleteGroup(g.id)} disabled={deletingGroupId === g.id} title="Delete group">{deletingGroupId === g.id ? "…" : "✕"}</button>
              </span>
            ))}
            {groups.length === 0 && !groupsLoading && <p className="text-sm text-muted-foreground">No groups yet — create one to organize contacts.</p>}
            {groupsLoading && groups.length === 0 && <p className="text-sm text-muted-foreground">Loading groups…</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contact list {total > 0 && `(${total})`} {listLoading && <span className="text-sm font-normal text-muted-foreground">(loading…)</span>}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Search name, business, phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="max-w-xs">
              <option value="">All groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name} ({g.memberCount})</option>
              ))}
            </Select>
            <Button variant="outline" onClick={() => void load()} disabled={listLoading}>{listLoading ? "Searching…" : "Search"}</Button>
            <Button variant="outline" onClick={() => { setSearch(""); setGroupFilter(""); setSelected([]); }}>Clear</Button>
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded bg-muted p-2 text-sm">
              <span className="font-medium">{selected.length} selected</span>
              <Select value={assignGroupId} onChange={(e) => setAssignGroupId(e.target.value)} className="max-w-[200px]">
                <option value="">Assign to group…</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </Select>
              <Button size="sm" variant="outline" onClick={bulkAssign} disabled={!assignGroupId || bulkActionLoading}>{bulkActionLoading ? "Working…" : "Assign"}</Button>
              <Button size="sm" variant="destructive" onClick={bulkDelete} disabled={bulkActionLoading}>{bulkActionLoading ? "Working…" : "Delete selected"}</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear selection</Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2 text-sm">
            <Button size="sm" variant="outline" onClick={toggleSelectAllVisible}>{allVisibleSelected ? "Deselect visible" : "Select visible"}</Button>
            <Button size="sm" variant="outline" onClick={selectAllInGroup} disabled={!groupFilter || selectingAll}>{selectingAll ? "Selecting…" : "Select all in group"}</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} aria-label="Select all visible" /></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Business Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Work</TableHead>
                <TableHead>Groups</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} aria-label={`Select ${c.name}`} /></TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.businessName}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell>{c.businessWork}</TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1">
                      {(c.groups ?? []).map(({ group }) => (
                        <Badge key={group.id} variant="secondary">{group.name}</Badge>
                      ))}
                    </span>
                  </TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                </TableRow>
              ))}
              {contacts.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No contacts yet — upload a file or add manually above.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
