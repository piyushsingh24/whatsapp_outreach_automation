import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-10">
      <h1 className="text-3xl font-bold">AI WhatsApp Business Outreach Automation</h1>
      <p className="text-muted-foreground">
        Upload Excel → Understand Business → Generate Personalized Messages with Groq → Send via
        WhatsApp (Evolution API) → Track Results.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Get started</CardTitle>
            <CardDescription>Login and open your dashboard</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Link href="/dashboard"><Button>Dashboard</Button></Link>
            <Link href="/contacts"><Button variant="outline">Import contacts</Button></Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Campaign flow</CardTitle>
            <CardDescription>Create → Generate → Review → Approve → Launch</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/campaigns"><Button variant="secondary">View campaigns</Button></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
