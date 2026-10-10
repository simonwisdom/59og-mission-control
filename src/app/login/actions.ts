"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_TTL_MS, getSessionSecret } from "@/lib/auth";
import { safeNextPath } from "@/lib/next-path";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSessionToken, passwordMatches } from "@/lib/session";

const limiter = createRateLimiter({ max: 5, windowMs: 15 * 60 * 1000 });

export type LoginState = { error?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const housePassword = process.env.HOUSE_PASSWORD;
  if (!housePassword) throw new Error("HOUSE_PASSWORD is not set");

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limiter.isBlocked(ip)) {
    return { error: "Too many attempts. Try again in 15 minutes." };
  }

  const attempt = String(formData.get("password") ?? "");
  if (!passwordMatches(attempt, housePassword)) {
    limiter.recordFailure(ip);
    return { error: "Wrong password." };
  }

  const expiresAt = Date.now() + SESSION_TTL_MS;
  (await cookies()).set(SESSION_COOKIE, createSessionToken(getSessionSecret(), expiresAt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
  redirect(safeNextPath(formData.get("next")));
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
