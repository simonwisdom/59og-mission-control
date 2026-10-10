import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, getSessionSecret } from "@/lib/auth";
import { safeNextPath } from "@/lib/next-path";
import { verifySessionToken } from "@/lib/session";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const loggedIn = !!token && verifySessionToken(token, getSessionSecret());
  // Housemates who are already logged in skip the password, before the login page renders
  if (request.nextUrl.pathname === "/login") {
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    return loggedIn ? NextResponse.redirect(new URL(next, request.url)) : NextResponse.next();
  }
  if (!loggedIn) {
    // Remember the page so login can return to it, e.g. an application opened from a notification
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
