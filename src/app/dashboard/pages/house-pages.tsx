import Link from "next/link";
import { desc } from "drizzle-orm";
import { FilePlus2, FileText } from "lucide-react";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { firstPhoto } from "@/lib/page-photos";

// The most recently changed pages show as tiles on the dashboard; the rest are under "All pages"
const SHOWN = 5;

// The house's own pages, as tiles in the same style as the useful links below them
export async function HousePages() {
  const list = await db
    .select({ id: pages.id, title: pages.title, body: pages.body, published: pages.published })
    .from(pages)
    .orderBy(desc(pages.updatedAt))
    .limit(SHOWN);

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="section-title">Our pages</h2>
        <Link href="/dashboard/pages" className="text-sm text-muted hover:text-pillar">
          All pages →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((page) => {
          const photo = firstPhoto(page.body);
          return (
            <Link
              key={page.id}
              href={`/dashboard/pages/${page.id}`}
              className="card flex items-center gap-3 border-2 border-ink/80 p-3 hover:border-tile"
            >
              {photo ? (
                // A page photo, already shrunk on upload, so next/image has nothing to add
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="size-10 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tile/10 text-tile">
                  <FileText className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate font-medium">{page.title}</span>
                <span className="block text-sm text-muted">{page.published ? "Shared, anyone with the link" : "Draft, housemates only"}</span>
              </span>
            </Link>
          );
        })}
        <Link
          href="/dashboard/pages?new"
          className="card flex items-center gap-3 border-2 border-dashed border-ink/50 p-3 hover:border-tile"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tile/10 text-tile">
            <FilePlus2 className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-medium">New page</span>
            <span className="block text-sm text-muted">Write something to share, with photos</span>
          </span>
        </Link>
      </div>
    </section>
  );
}
