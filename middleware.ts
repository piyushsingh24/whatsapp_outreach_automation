export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/contacts/:path*", "/campaigns/:path*", "/messages/:path*", "/whatsapp/:path*", "/settings/:path*"],
};
