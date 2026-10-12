"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { loginLinks } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { hashLinkKey, newLinkKey } from "@/lib/session";

// The key is only returned here, once: the database keeps just its hash
export type NewLinkState = { name: string; key: string } | { error: string } | undefined;

export async function createLink(_prev: NewLinkState, formData: FormData): Promise<NewLinkState> {
  await requireSession();
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  if (!name) return { error: "Add a name, so you know whose link it is." };

  const key = newLinkKey();
  await db.insert(loginLinks).values({ name, keyHash: hashLinkKey(key) });
  revalidatePath("/dashboard/login-links");
  return { name, key };
}

export async function deleteLink(id: number) {
  await requireSession();
  await db.delete(loginLinks).where(eq(loginLinks.id, id));
  revalidatePath("/dashboard/login-links");
}
