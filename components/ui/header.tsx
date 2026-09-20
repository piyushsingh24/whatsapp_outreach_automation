"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LogOut, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/contacts", label: "Contacts" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/messages", label: "Messages" },
  { href: "/whatsapp", label: "WhatsApp" },
  { href: "/settings", label: "Settings" },
];

export default function Header() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const user = session?.user as { name?: string | null; email?: string | null } | undefined;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex min-h-14 flex-wrap items-center gap-x-6 gap-y-2 py-2">
        <Link href="/" className="flex items-center gap-2 font-bold text-green-700">
          <MessageCircle className="h-5 w-5" />
          <span>WhatsApp Outreach AI</span>
        </Link>
        {status === "authenticated" && (
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded px-1 py-0.5 transition-colors hover:text-foreground",
                  pathname.startsWith(l.href) ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-3 text-sm">
          {status === "loading" ? (
            <span className="text-muted-foreground">…</span>
          ) : user ? (
            <>
              <span className="hidden max-w-48 truncate text-muted-foreground sm:inline" title={user.email ?? undefined}>
                {user.name ?? user.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className={cn("hover:text-foreground", pathname === "/login" ? "font-medium text-foreground" : "text-muted-foreground")}>
                Login
              </Link>
              <Link href="/register">
                <Button size="sm">Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
