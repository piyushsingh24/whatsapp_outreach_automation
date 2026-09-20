"use client";

import { SessionProvider } from "next-auth/react";

/** Client boundary so the server-component layout can provide session context. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}
