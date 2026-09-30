import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, notes } from "@/db/schema";
import { REVIEWER_COOKIE, STATUSES } from "@/lib/review";
import { addNote, setStatus } from "../actions";
import { StatusBadge } from "../../status-badge";
import { formatDate } from "@/lib/format";
import { FIELD_LABELS, formatPartySize } from "@/lib/field-labels";
import { ShareButtons } from "./share-buttons";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [app] = await db.select().from(applications).where(eq(applications.id, id));
  if (!app) notFound();

  const appNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.applicationId, id))
    .orderBy(asc(notes.createdAt));
  const reviewerName = (await cookies()).get(REVIEWER_COOKIE)?.value ?? "";

  const decisionLabels = { pending: "Back to pending", approved: "Approve", declined: "Decline" };

  return (
    <>
      <Link href="/dashboard/applications" className="text-sm text-muted hover:underline">
        ← All applications
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="hand text-2xl">{app.name}</h1>
          <p className="text-muted">
            {formatDate(app.arrivalDate)} to {formatDate(app.departureDate)} ·{" "}
            {formatPartySize(app.partySize)}
          </p>
        </div>
        <form action={setStatus.bind(null, app.id)} className="flex flex-wrap items-center gap-2">
          <StatusBadge status={app.status} />
          {STATUSES.filter((status) => status !== app.status).map((status) => (
            <button key={status} type="submit" name="status" value={status} className="btn-secondary">
              {decisionLabels[status]}
            </button>
          ))}
        </form>
      </div>

      <div className="mt-4 mb-6 border-y border-line py-3">
        <ShareButtons app={app} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card space-y-4 lg:col-span-3">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Email" value={<a href={`mailto:${app.email}`} className="text-accent hover:underline">{app.email}</a>} />
            <Detail label="Applied" value={formatDate(app.createdAt)} />
          </dl>
          <dl className="space-y-4 border-t border-line pt-4">
            <Detail label={FIELD_LABELS.about} value={app.about} />
            <Detail label={FIELD_LABELS.connection} value={app.connection} />
            <Detail label={FIELD_LABELS.anythingElse} value={app.anythingElse} />
            <Detail label="Read the onboarding doc" value={app.agreedToRules ? "Yes" : "No"} />
          </dl>
        </section>

        <section className="card lg:col-span-2">
          <h2 className="legend mb-3">Housemate notes</h2>
          {appNotes.length === 0 ? (
            <p className="text-sm text-muted">No notes yet.</p>
          ) : (
            <ul className="space-y-3">
              {appNotes.map((note) => (
                <li key={note.id} className="text-sm">
                  <div className="font-medium">
                    {note.author} <span className="font-normal text-muted">· {formatDate(note.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{note.body}</p>
                </li>
              ))}
            </ul>
          )}
          <form action={addNote.bind(null, app.id)} className="mt-4 space-y-2 border-t border-line pt-3">
            <input name="author" required placeholder="Your name" defaultValue={reviewerName} className="input" />
            <textarea name="body" required rows={2} placeholder="Add a note or vote…" className="input" />
            <div className="flex justify-end">
              <button type="submit" className="btn-primary">Add note</button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
