import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { loginLinks } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { deleteLink } from "./actions";
import { NewLinkForm } from "./new-link-form";

export const metadata: Metadata = { title: "Login links" };

export default async function LoginLinksPage() {
  const links = await db
    .select({ id: loginLinks.id, name: loginLinks.name, createdAt: loginLinks.createdAt, lastUsedAt: loginLinks.lastUsedAt })
    .from(loginLinks)
    .orderBy(asc(loginLinks.name));

  return (
    <>
      <h1 className="hand mb-2 text-2xl">Login links</h1>
      <p className="mb-6 max-w-2xl text-muted">
        A login link logs housemates in without the password. Make one for the whole house and share its QR code, or
        one each. They open it once on each phone or laptop and stay logged in, as long as they visit at least once a
        year. Turning a link off logs out every device that used it, so when someone moves out, turn the link off and
        share a new one.
      </p>
      <NewLinkForm />
      {links.length > 0 && (
        <ul className="card mt-3 divide-y divide-line py-0">
          {links.map((link) => (
            <li key={link.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium">{link.name}</p>
                <p className="text-sm text-muted">
                  Made {formatDate(link.createdAt)} ·{" "}
                  {link.lastUsedAt ? `last used ${formatDate(link.lastUsedAt)}` : "not used yet"}
                </p>
              </div>
              <form action={deleteLink.bind(null, link.id)} className="shrink-0">
                <button type="submit" className="btn-secondary">
                  Turn off
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
