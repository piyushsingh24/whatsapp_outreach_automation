import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Environment & integrations</CardTitle>
          <CardDescription>Configure via server environment variables (never exposed to the browser)</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li><code>DATABASE_URL</code> — MySQL connection string</li>
            <li><code>REDIS_URL</code> — Redis for BullMQ queues</li>
            <li><code>GROQ_API_KEY</code> / <code>GROQ_MODEL</code> — Groq message generation</li>
            <li><code>EVOLUTION_API_URL</code> / <code>EVOLUTION_API_KEY</code> — WhatsApp sending + webhooks</li>
            <li><code>NEXTAUTH_SECRET</code> — session signing</li>
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Sending controls (batch size, delay, retries) are configured per campaign.
            Webhook endpoint: <code>POST /api/webhooks/evolution</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
