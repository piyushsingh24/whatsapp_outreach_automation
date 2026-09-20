import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-10 text-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Please <Link href="/login" className="font-medium text-primary hover:underline">login</Link> to view your metrics.
        </p>
      </div>
    );
  }

  const [totalContacts, activeCampaigns, sent, delivered, failed, pending, recent] = await Promise.all([
    prisma.contact.count({ where: { userId } }),
    prisma.campaign.count({ where: { userId, status: { in: ["RUNNING", "PAUSED", "APPROVED", "GENERATING"] } } }),
    prisma.message.count({ where: { campaign: { userId }, status: { in: ["SENT", "DELIVERED", "READ"] } } }),
    prisma.message.count({ where: { campaign: { userId }, status: { in: ["DELIVERED", "READ"] } } }),
    prisma.message.count({ where: { campaign: { userId }, status: "FAILED" } }),
    prisma.message.count({
      where: { campaign: { userId }, status: { in: ["PENDING", "GENERATING", "QUEUED", "SENDING", "APPROVED", "GENERATED"] } },
    }),
    prisma.campaign.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, name: true, status: true, sentCount: true, deliveredCount: true, failedCount: true, updatedAt: true },
    }),
  ]);

  const cards = [
    ["Total contacts", totalContacts, "/contacts"],
    ["Active campaigns", activeCampaigns, "/campaigns"],
    ["Messages sent", sent, "/messages"],
    ["Delivered", delivered, "/messages"],
    ["Failed", failed, "/messages"],
    ["Pending", pending, "/messages"],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/campaigns" className="text-sm font-medium text-primary hover:underline">
          + New campaign
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value, href]) => (
          <Link key={label} href={href}>
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{value}</p></CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Recent campaigns</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No campaigns yet. <Link href="/campaigns" className="font-medium text-primary hover:underline">Create one</Link> to get started.
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {recent.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="flex items-center gap-2">
                    <Link href={`/campaigns/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                    <StatusBadge status={c.status} />
                  </span>
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
