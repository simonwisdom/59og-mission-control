import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { Crumbs } from "../../crumbs";
import { Editor } from "./editor";

async function findPage(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id)) return null;
  const [page] = await db.select().from(pages).where(eq(pages.id, id));
  return page ?? null;
}

// Drafts are private, so check the session here too rather than rely on the layout
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  await requireSession();
  const page = await findPage((await params).id);
  return { title: page ? `Edit: ${page.title}` : "Page" };
}

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const page = await findPage((await params).id);
  if (!page) notFound();

  return (
    <>
      <Crumbs trail={[{ label: "Pages", href: "/dashboard/pages" }]} />
      <Editor
        page={{
          id: page.id,
          title: page.title,
          slug: page.slug,
          body: page.body,
          published: page.published,
          updatedAt: page.updatedAt.toISOString(),
        }}
      />
    </>
  );
}
