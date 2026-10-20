"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { houseMailbox } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { SIGN_IN_COOKIE, authUrl, isGmailConfigured, pkcePair, redirectUri } from "@/lib/gmail";

// Sends the housemate to Google to sign in as the house account. The state and PKCE verifier wait in
// a short-lived cookie that only the callback reads.
export async function connectGmail() {
  await requireSession();
  if (!isGmailConfigured()) return;
  const state = randomBytes(24).toString("base64url");
  const { verifier, challenge } = pkcePair();
  (await cookies()).set({
    name: SIGN_IN_COOKIE,
    value: `${state}.${verifier}`,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/dashboard/email/callback",
    maxAge: 10 * 60,
  });
  redirect(authUrl(process.env.GMAIL_CLIENT_ID!, redirectUri(), state, challenge));
}

// Forgets the login. The mail already read stays; to cut access completely, also remove the app at
// myaccount.google.com/permissions while signed in as the house account.
export async function disconnectGmail() {
  await requireSession();
  await db.delete(houseMailbox);
  revalidatePath("/dashboard/email");
}
