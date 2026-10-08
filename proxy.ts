import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * Optimistic gate for the signed-in screens: no session cookie, straight to sign-in,
 * before any page code runs. Only reads the cookie; requireUser() in the (app) layout
 * still checks the session against the database on every render.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();
  return NextResponse.redirect(new URL("/auth", request.url));
}

// Everything under app/(app). Sign-in, join links, doctor share links and the API stay public.
export const config = {
  matcher: ["/home", "/help", "/p/:path*"],
};
