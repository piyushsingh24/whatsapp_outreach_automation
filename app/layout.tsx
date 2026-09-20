
import type { Metadata } from "next";

// @ts-ignore
import "./globals.css";
import { Providers } from "@/components/providers";
import Header from "@/components/ui/header";

export const metadata: Metadata = {
  title: "WhatsApp Outreach AI",
  description: "AI-powered personalized WhatsApp business outreach",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-background font-sans antialiased">
        <Providers>
          <Header />
          <main className="container flex-1 py-6">{children}</main>
          <footer className="border-t py-4">
            <p className="container text-center text-xs text-muted-foreground">
              WhatsApp Outreach AI — personalized campaigns, sent responsibly. Messaging activity must comply with WhatsApp policies.
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
