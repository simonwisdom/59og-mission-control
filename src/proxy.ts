import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { loginLinks } from "@/db/schema";
import { SESSION_COOKIE, SESSION_RENEW_AFTER_MS, SESSION_TTL_MS, readSession, sessionCookie } from "@/lib/auth";
import { safeNextPath } from "@/lib/next-path";

export async function proxy(request: NextRequest) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  let response: NextResponse;
  // Housemates who are already logged in skip the password, before the login page renders
  if (request.nextUrl.pathname === "/login") {
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    response = session ? NextResponse.redirect(new URL(next, request.url)) : NextResponse.next();
  } else if (!session) {
    // Remember the page so login can return to it, e.g. an application opened from a notification
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  } else {
    response = NextResponse.next();
  }

  // Keep the session a year from the last visit, so housemates who use the dashboard never log in again
  if (session && session.expiresAt < Date.now() + SESSION_TTL_MS - SESSION_RENEW_AFTER_MS) {
    response.cookies.set(sessionCookie(session.linkId));
    if (session.linkId !== null) {
      await db.update(loginLinks).set({ lastUsedAt: new Date() }).where(eq(loginLinks.id, session.linkId));
    }
  }
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
