"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { houseDocuments } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { isWebUrl } from "@/lib/documents";

export async function addDocument(formData: FormData) {
  await requireSession();
  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  const url = String(formData.get("url") ?? "").trim().slice(0, 2000);
  const expiresOn = String(formData.get("expiresOn") ?? "");
  if (!name || !isWebUrl(url)) return;

  await db.insert(houseDocuments).values({
    name,
    url,
    expiresOn: /^\d{4}-\d{2}-\d{2}$/.test(expiresOn) ? expiresOn : null,
  });
  revalidatePath("/dashboard", "layout");
}

export async function deleteDocument(id: number) {
  await requireSession();
  await db.delete(houseDocuments).where(eq(houseDocuments.id, id));
  revalidatePath("/dashboard", "layout");
}
