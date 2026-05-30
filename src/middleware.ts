import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  /*
   * Match all paths EXCEPT:
   *   /login          — public auth page
   *   /api/auth/*     — NextAuth endpoints
   *   /api/whatsapp/webhook — Meta webhook (verified by verify_token, not session)
   *   /_next/*        — Next.js internals
   *   /favicon.ico    — static asset
   */
  matcher: [
    "/((?!login|api/auth|api/whatsapp/webhook|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
