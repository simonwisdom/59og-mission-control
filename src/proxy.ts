import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, getSessionSecret } from "@/lib/auth";
import { verifySessionToken } from "@/lib/session";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !verifySessionToken(token, getSessionSecret())) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/dashboard/:path*",
};
