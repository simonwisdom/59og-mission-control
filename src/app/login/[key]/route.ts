import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { loginLinks } from "@/db/schema";
import { sessionCookie } from "@/lib/auth";
import { hashLinkKey } from "@/lib/session";

// A housemate's personal login link: opening it logs this device in, with no password.
// The key is 24 random bytes, so it can't be guessed and needs no rate limit.
export async function GET(request: NextRequest, { params }: RouteContext<"/login/[key]">) {
  const { key } = await params;
  const [link] = await db
    .update(loginLinks)
    .set({ lastUsedAt: new Date() })
    .where(eq(loginLinks.keyHash, hashLinkKey(key)))
    .returning({ id: loginLinks.id });
  if (!link) return NextResponse.redirect(new URL("/login?link=off", request.url));

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.set(sessionCookie(link.id));
  return response;
}
