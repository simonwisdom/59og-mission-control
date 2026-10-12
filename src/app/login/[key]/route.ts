import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { loginLinks } from "@/db/schema";
import { sessionCookie } from "@/lib/auth";
import { hashLinkKey } from "@/lib/session";

// A housemate's personal login link: opening it logs this device in, with no password.
// The key is 24 random bytes, so it can't be guessed and needs no rate limit.
export async function GET(_request: Request, { params }: RouteContext<"/login/[key]">) {
  const { key } = await params;
  const [link] = await db
    .update(loginLinks)
    .set({ lastUsedAt: new Date() })
    .where(eq(loginLinks.keyHash, hashLinkKey(key)))
    .returning({ id: loginLinks.id });
  if (!link) return redirectTo("/login?link=off");

  const response = redirectTo("/dashboard");
  response.cookies.set(sessionCookie(link.id));
  return response;
}

// A relative redirect: behind Railway's proxy, request.url is the internal address (localhost:8080),
// not the one the housemate opened
function redirectTo(path: string) {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}
