import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { Crumbs } from "../crumbs";
import { createPage } from "./actions";

export const metadata: Metadata = { title: "Pages" };

// ?new, from the dashboard's "New page" tile, puts the cursor straight in the title box
export default async function PagesList({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const startNew = (await searchParams).new !== undefined;
  const list = await db
    .select({
      id: pages.id,
      title: pages.title,
      slug: pages.slug,
      published: pages.published,
      updatedAt: pages.updatedAt,
      updatedBy: pages.updatedBy,
    })
    .from(pages)
    .orderBy(desc(pages.updatedAt));

  return (
    <>
      <Crumbs />
      <h1 className="hand mb-2 text-2xl">Pages</h1>
      <p className="mb-6 max-w-2xl text-muted">
        Pages any housemate can write and change, like the room listing. Publish a page to share its link with anyone;
        drafts stay within the house.
      </p>
      <form action={createPage} className="card flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="label">New page</span>
          <input name="title" required maxLength={200} placeholder="e.g. House rules" autoFocus={startNew} className="input" />
        </label>
        <button type="submit" className="btn-primary py-1.5 text-sm">
          Make page
        </button>
      </form>
      {list.length > 0 && (
        <ul className="card mt-3 divide-y divide-line py-0">
          {list.map((page) => (
            <li key={page.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3">
              <div className="min-w-0">
                <Link href={`/dashboard/pages/${page.id}`} className="font-medium hover:text-pillar">
                  {page.title}
                </Link>
                <p className="text-sm text-muted">
                  /p/{page.slug} · {page.published ? "Published" : "Draft"} · changed {formatDate(page.updatedAt)}
                  {page.updatedBy && ` by ${page.updatedBy}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link href={`/p/${page.slug}`} className="btn-secondary">
                  View
                </Link>
                <Link href={`/dashboard/pages/${page.id}`} className="btn-secondary">
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
