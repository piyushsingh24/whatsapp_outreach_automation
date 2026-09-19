"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Contact {
  id: string;
  name: string;
  businessName: string;
  phone: string;
  businessWork: string;
  status: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch(`/api/contacts?search=${encodeURIComponent(search)}&pageSize=50`);
    if (res.ok) {
      const j = await res.json();
      setContacts(j.contacts);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload() {
    if (!file) return;
    setLoading(true);
    setSummary(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/contacts/import", { method: "POST", body: form });
    const j = await res.json();
    setLoading(false);
    if (res.ok) {
      setSummary(j.summary);
      void load();
    } else {
      setSummary({ error: j?.error?.message ?? "Import failed" });
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Contacts</h1>
      <Card>
        <CardHeader><CardTitle>Import Excel / CSV</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Columns required: Name, Business Name, Phone Number, Business Work (.xlsx, .xls, .csv — max 10 MB)
          </p>
          <div className="flex gap-2">
            <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Button onClick={upload} disabled={!file || loading}>{loading ? "Importing…" : "Upload"}</Button>
          </div>
          {summary && <pre className="overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(summary, null, 2)}</pre>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Contact list</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Search name, business, phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button variant="outline" onClick={() => void load()}>Search</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Work</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.businessName}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell>{c.businessWork}</TableCell>
                  <TableCell><Badge variant="secondary">{c.status}</Badge></TableCell>
                </TableRow>
              ))}
              {contacts.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No contacts yet — upload a file above.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
