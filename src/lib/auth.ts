import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "./session";

export const SESSION_COOKIE = "house_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters");
  }
  return secret;
}

export async function isLoggedIn() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token, getSessionSecret()) : false;
}

// Call at the top of every dashboard page and server action. The proxy only
// does an optimistic redirect, so this is the real check.
export async function requireSession() {
  if (!(await isLoggedIn())) redirect("/login");
}
