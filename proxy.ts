import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * Optimistic gate: no session cookie on an app screen → sign-in, before page code runs.
 * The (app) layout still validates the session against the database on every render.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();
  const url = new URL("/sign-in", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/members/:path*",
    "/medications/:path*",
    "/appointments/:path*",
    "/records/:path*",
    "/emergency/:path*",
    "/triage/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
  ],
};
