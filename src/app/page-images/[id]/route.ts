import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pageImages, pages } from "@/db/schema";
import { isLoggedIn } from "@/lib/auth";

// A photo from a page. Like the page, it's public once the page is published.
export async function GET(_request: Request, { params }: RouteContext<"/page-images/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });
  const [image] = await db
    .select({ contentType: pageImages.contentType, data: pageImages.data, published: pages.published })
    .from(pageImages)
    .innerJoin(pages, eq(pageImages.pageId, pages.id))
    .where(eq(pageImages.id, id));
  if (!image || (!image.published && !(await isLoggedIn()))) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.contentType,
      // A photo never changes once uploaded, but a draft's photos stay out of shared caches
      "Cache-Control": image.published ? "public, max-age=86400" : "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
