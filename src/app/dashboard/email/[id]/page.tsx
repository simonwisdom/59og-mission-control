import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { emails } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { Crumbs } from "../../crumbs";

export const metadata: Metadata = { title: "Email" };

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/London" });

const size = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

// One mail, as plain text only: it was written outside the house, so none of its HTML or images load
export default async function EmailMessagePage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [email] = await db
    .select()
    .from(emails)
    .where(and(eq(emails.id, id), eq(emails.deleted, false)));
  if (!email) notFound();

  return (
    <>
      <Crumbs trail={[{ label: "Email", href: "/dashboard/email" }]} />
      <article className="card">
        <h1 className="text-xl font-medium">{email.subject}</h1>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-sm">
          <dt className="text-muted">From</dt>
          <dd className="break-words">
            {email.fromName}
            {email.fromAddress && email.fromAddress !== email.fromName && (
              <span className="text-muted"> &lt;{email.fromAddress}&gt;</span>
            )}
          </dd>
          <dt className="text-muted">To</dt>
          <dd className="break-words">{email.to}</dd>
          <dt className="text-muted">Date</dt>
          <dd>{when.format(email.sentAt)}</dd>
        </dl>
        {email.attachments.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {email.attachments.map((a, i) => (
              <li key={i} className="rounded-[2px] border border-line px-2 py-0.5 text-muted">
                📎 {a.filename || a.mimeType} · {size(a.size)}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 border-t border-line pt-4 text-[15px] leading-relaxed break-words whitespace-pre-wrap">
          {email.body || <span className="text-muted">No text in this mail.</span>}
        </div>
      </article>
      {email.attachments.length > 0 && (
        <p className="mt-2 text-xs text-muted">Attachments are listed only. Open the mail in Gmail to see them.</p>
      )}
    </>
  );
}
