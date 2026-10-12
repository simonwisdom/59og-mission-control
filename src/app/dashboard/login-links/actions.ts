"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/db";
import { loginLinks } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { hashLinkKey, newLinkKey } from "@/lib/session";

// The link is only returned here, once: the database keeps just a hash of its key.
// The QR code is drawn here too, so the link never goes to an outside QR site.
export type NewLinkState = { name: string; url: string; qrSvg: string } | { error: string } | undefined;

export async function createLink(_prev: NewLinkState, formData: FormData): Promise<NewLinkState> {
  await requireSession();
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  if (!name) return { error: "Add a name, so you know whose link it is." };
  // Browsers send Origin with every server action, so this is the site's address as the housemate sees it
  const origin = (await headers()).get("origin");
  if (!origin) return { error: "Couldn't tell this site's address. Try again from the browser." };

  const key = newLinkKey();
  await db.insert(loginLinks).values({ name, keyHash: hashLinkKey(key) });
  revalidatePath("/dashboard/login-links");
  const url = `${origin}/login/${key}`;
  return { name, url, qrSvg: await QRCode.toString(url, { type: "svg", margin: 2 }) };
}

export async function deleteLink(id: number) {
  await requireSession();
  await db.delete(loginLinks).where(eq(loginLinks.id, id));
  revalidatePath("/dashboard/login-links");
}
