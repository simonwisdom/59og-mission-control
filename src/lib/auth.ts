import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { loginLinks } from "@/db/schema";
import { createSessionToken, readSessionToken, type Session } from "./session";

export const SESSION_COOKIE = "house_session";
// The proxy renews the cookie on a visit once it's a day old, so it runs out only after
// a year without opening the dashboard
export const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;
export const SESSION_RENEW_AFTER_MS = 24 * 60 * 60 * 1000;

export function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters");
  }
  return secret;
}

// A session from a login link only counts while the link still exists
export async function readSession(token: string | undefined): Promise<Session | null> {
  const session = token ? readSessionToken(token, getSessionSecret()) : null;
  if (session?.linkId == null) return session;
  const [link] = await db.select({ id: loginLinks.id }).from(loginLinks).where(eq(loginLinks.id, session.linkId));
  return link ? session : null;
}

export function sessionCookie(linkId: number | null) {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  return {
    name: SESSION_COOKIE,
    value: createSessionToken(getSessionSecret(), expiresAt, linkId),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  } as const;
}

export async function isLoggedIn() {
  return (await readSession((await cookies()).get(SESSION_COOKIE)?.value)) !== null;
}

// Call at the top of every dashboard page and server action. The proxy only
// does an optimistic redirect, so this is the real check.
export async function requireSession() {
  if (!(await isLoggedIn())) redirect("/login");
}
