import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, getSessionSecret } from "@/lib/auth";
import { verifySessionToken } from "@/lib/session";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const loggedIn = !!token && verifySessionToken(token, getSessionSecret());
  // Housemates who are already logged in skip the password, before the login page renders
  if (request.nextUrl.pathname === "/login") {
    return loggedIn ? NextResponse.redirect(new URL("/dashboard", request.url)) : NextResponse.next();
  }
  if (!loggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
