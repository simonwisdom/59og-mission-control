"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, notes } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { REVIEWER_COOKIE, isStatus } from "@/lib/review";


export async function setStatus(applicationId: number, formData: FormData) {
  await requireSession();
  const status = formData.get("status");
  if (!isStatus(status)) throw new Error(`Invalid status: ${String(status)}`);

  await db.update(applications).set({ status }).where(eq(applications.id, applicationId));
  revalidatePath("/dashboard", "layout");
}

// Notes go with it (the foreign key cascades)
export async function deleteApplication(applicationId: number) {
  await requireSession();
  await db.delete(applications).where(eq(applications.id, applicationId));
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/applications");
}

export async function addNote(applicationId: number, formData: FormData) {
  await requireSession();
  const author = String(formData.get("author") ?? "").trim().slice(0, 100);
  const body = String(formData.get("body") ?? "").trim().slice(0, 5000);
  if (!author || !body) return;

  await db.insert(notes).values({ applicationId, author, body });
  (await cookies()).set(REVIEWER_COOKIE, author, {
    httpOnly: true,
    sameSite: "lax",
    path: "/dashboard",
    maxAge: 365 * 24 * 60 * 60,
  });
  revalidatePath(`/dashboard/applications/${applicationId}`);
}
