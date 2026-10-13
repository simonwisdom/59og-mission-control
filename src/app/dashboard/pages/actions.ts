"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { pageImages, pages } from "@/db/schema";
import { requireSession, sessionName } from "@/lib/auth";
import { isValidSlug, slugify } from "@/lib/page-slug";

const TITLE_MAX = 200;
const BODY_MAX = 100_000;
// The editor shrinks photos to well under this before upload; see next.config.ts for the request limit
const IMAGE_MAX_BYTES = 3 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Postgres's "unique value already exists" error, raised when two pages would share a link
const isUniqueViolation = (error: unknown) => (error as { code?: string })?.code === "23505";

// The first free slug from the title: "room", then "room-2", "room-3"…
async function freeSlug(title: string) {
  const base = slugify(title) || "page";
  const taken = new Set(
    (await db.select({ slug: pages.slug }).from(pages).where(or(eq(pages.slug, base), like(pages.slug, `${base}-%`)))).map(
      (row) => row.slug,
    ),
  );
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!taken.has(slug)) return slug;
  }
}

export async function createPage(formData: FormData) {
  await requireSession();
  const title = String(formData.get("title") ?? "").trim().slice(0, TITLE_MAX) || "Untitled page";
  let id: number | undefined;
  // Retry once in case someone else took the same link at the same moment
  for (let attempt = 0; attempt < 2 && id === undefined; attempt++) {
    try {
      [{ id }] = await db
        .insert(pages)
        .values({ title, slug: await freeSlug(title), updatedBy: await sessionName() })
        .returning({ id: pages.id });
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === 1) throw error;
    }
  }
  revalidatePath("/dashboard/pages");
  redirect(`/dashboard/pages/${id}`);
}

export type SaveState = { savedAt: string; error?: undefined } | { error: string; savedAt?: undefined } | undefined;

export async function savePage(_prev: SaveState, formData: FormData): Promise<SaveState> {
  await requireSession();
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const body = String(formData.get("body") ?? "");
  const published = formData.get("published") === "on";
  // When this editor last loaded or saved the page, to catch two people editing at once
  const loadedAt = new Date(String(formData.get("loadedAt") ?? ""));

  if (!Number.isInteger(id) || Number.isNaN(loadedAt.getTime())) return { error: "Something went wrong. Reload the page." };
  if (!title) return { error: "Add a title." };
  if (title.length > TITLE_MAX) return { error: `Keep the title under ${TITLE_MAX} characters.` };
  if (!isValidSlug(slug)) return { error: "The link name can only use lowercase letters, numbers and single dashes." };
  if (body.length > BODY_MAX) return { error: "The page is too long to save." };

  try {
    const saved = await db
      .update(pages)
      .set({ title, slug, body, published, updatedAt: new Date(), updatedBy: await sessionName() })
      // Postgres keeps microseconds and JavaScript dates only milliseconds, so compare at that precision
      .where(and(eq(pages.id, id), sql`date_trunc('milliseconds', ${pages.updatedAt}) = ${loadedAt.toISOString()}::timestamptz`))
      .returning({ updatedAt: pages.updatedAt });
    if (saved.length === 0) {
      const [exists] = await db.select({ id: pages.id }).from(pages).where(eq(pages.id, id));
      return {
        error: exists
          ? "Someone else saved this page while you were editing. Copy your changes somewhere, reload, and add them again."
          : "This page has been deleted.",
      };
    }
    revalidatePath("/dashboard/pages");
    return { savedAt: saved[0].updatedAt.toISOString() };
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "Another page already uses that link name. Pick a different one." };
    throw error;
  }
}

export async function deletePage(id: number) {
  await requireSession();
  await db.delete(pages).where(eq(pages.id, id));
  revalidatePath("/dashboard/pages");
  redirect("/dashboard/pages");
}

export type UploadResult = { url: string } | { error: string };

export async function uploadImage(pageId: number, formData: FormData): Promise<UploadResult> {
  await requireSession();
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo." };
  if (!IMAGE_TYPES.includes(file.type)) return { error: "Use a JPEG, PNG, WebP or GIF image." };
  if (file.size > IMAGE_MAX_BYTES) return { error: "That photo is too big. Try a smaller one." };
  const [page] = await db.select({ id: pages.id }).from(pages).where(eq(pages.id, pageId));
  if (!page) return { error: "This page has been deleted." };

  const [image] = await db
    .insert(pageImages)
    .values({ pageId, contentType: file.type, data: Buffer.from(await file.arrayBuffer()) })
    .returning({ id: pageImages.id });
  return { url: `/page-images/${image.id}` };
}
