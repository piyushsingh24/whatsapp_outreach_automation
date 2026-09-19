
import "./globals.css";
import { SessionProvider  } from "next-auth/react";
import Header from "@/components/ui/header";


export default function RootLayout({ children }: { children: React.ReactNode }) {

  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <SessionProvider>
          <Header />
          <main className="container py-6">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
