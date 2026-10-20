import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { emails, houseMailbox } from "@/db/schema";
import { isLoggedIn, sessionName } from "@/lib/auth";
import { GmailError, SIGN_IN_COOKIE, exchangeCode, isGmailConfigured } from "@/lib/gmail";
import { syncHouseMail } from "@/lib/house-mail";
import { passwordMatches } from "@/lib/session";

// Where Google sends the housemate back after they sign in as the house account
export async function GET(request: Request) {
  if (!(await isLoggedIn())) return redirectTo("/login");
  const jar = await cookies();
  const [state, verifier] = (jar.get(SIGN_IN_COOKIE)?.value ?? "").split(".");
  jar.delete({ name: SIGN_IN_COOKIE, path: "/dashboard/email/callback" });

  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  if (!isGmailConfigured() || !state || !verifier || !passwordMatches(params.get("state") ?? "", state)) {
    return redirectTo("/dashboard/email?error=expired");
  }
  if (!code) return redirectTo("/dashboard/email?error=refused");

  try {
    const { refreshToken, address } = await exchangeCode(code, verifier);
    const connectedBy = await sessionName();
    await db.transaction(async (tx) => {
      const [old] = await tx.select({ address: houseMailbox.address }).from(houseMailbox).limit(1);
      // Another account's mail doesn't belong with this one's
      if (old && old.address !== address) await tx.delete(emails);
      await tx.delete(houseMailbox);
      await tx.insert(houseMailbox).values({ address, refreshToken, connectedBy });
    });
  } catch (error) {
    console.error("Connecting the house Gmail failed", error);
    return redirectTo(`/dashboard/email?error=${error instanceof GmailError ? "google" : "failed"}`);
  }
  // Start on the first 30 days now; the page shows what's in so far
  void syncHouseMail();
  return redirectTo("/dashboard/email");
}

// A relative redirect: behind Railway's proxy, request.url is the internal address
function redirectTo(path: string) {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}
