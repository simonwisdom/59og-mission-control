import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { isLoggedIn } from "@/lib/auth";
import { isValidSlug } from "@/lib/page-slug";
import { PageBody } from "../../page-body";
import { SiteBar } from "../../site-bar";

// Anyone with the link sees a published page; a draft only shows to housemates
async function findPage(slug: string) {
  if (!isValidSlug(slug)) return null;
  const [page] = await db.select().from(pages).where(eq(pages.slug, slug));
  if (!page) return null;
  if (!page.published && !(await isLoggedIn())) return null;
  return page;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = await findPage((await params).slug);
  return { title: page?.title ?? "Page not found" };
}

export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = await findPage((await params).slug);
  if (!page) notFound();
  const housemate = await isLoggedIn();

  return (
    <div className="min-h-screen">
      <SiteBar home={housemate ? "/dashboard" : "/"}>
        {housemate && (
          <Link href={`/dashboard/pages/${page.id}`} className="hover:underline">
            Edit page
          </Link>
        )}
      </SiteBar>
      <main className="mx-auto max-w-2xl px-4 py-10">
        {!page.published && (
          <p className="mb-6 rounded-[2px] border border-pillar px-3 py-2 text-sm text-pillar">
            Draft: only housemates can see this page until it&apos;s published.
          </p>
        )}
        <h1 className="hand mb-6 text-3xl sm:text-4xl">{page.title}</h1>
        <PageBody markdown={page.body} />
      </main>
    </div>
  );
}
