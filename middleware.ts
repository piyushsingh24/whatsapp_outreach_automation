import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const PROTECTED = [
  "/dashboard",
  "/contacts",
  "/campaigns",
  "/messages",
  "/whatsapp",
  "/settings",
];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const isAuthed = Boolean(req.nextauth.token);
    // Logged-in users don't need the auth pages — send them to the dashboard.
    if (isAuthed && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      // Only gate the protected sections; public + auth pages pass through
      // (the middleware function above handles the logged-in redirect).
      authorized: ({ token, req }) => {
        if (PROTECTED.some((p) => req.nextUrl.pathname.startsWith(p))) {
          return Boolean(token);
        }
        return true;
      },
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/contacts/:path*",
    "/campaigns/:path*",
    "/messages/:path*",
    "/whatsapp/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
