import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getData() {
  const base = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/dashboard`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const data = await getData();
  const m = data?.metrics ?? { totalContacts: "—", activeCampaigns: "—", sent: "—", delivered: "—", failed: "—", pending: "—" };
  const cards = [
    ["Total contacts", m.totalContacts],
    ["Active campaigns", m.activeCampaigns],
    ["Messages sent", m.sent],
    ["Delivered", m.delivered],
    ["Failed", m.failed],
    ["Pending", m.pending],
  ] as const;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {!data && <p className="text-sm text-muted-foreground">Login to view live metrics.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{String(value)}</p></CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Recent campaigns</CardTitle></CardHeader>
        <CardContent>
          {(data?.recentCampaigns ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No campaigns yet. Create one from the Campaigns page.</p>
          ) : (
            <ul className="divide-y text-sm">
              {(data.recentCampaigns as Array<{ id: string; name: string; status: string; sentCount: number; deliveredCount: number; failedCount: number }>).map((c) => (
                <li key={c.id} className="flex justify-between py-2">
                  <span>{c.name} <span className="text-muted-foreground">({c.status})</span></span>
                  <span className="text-muted-foreground">Sent {c.sentCount} · Delivered {c.deliveredCount} · Failed {c.failedCount}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
