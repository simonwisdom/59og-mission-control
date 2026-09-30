import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, notes } from "@/db/schema";
import { REVIEWER_COOKIE, STATUSES } from "@/lib/review";
import { addNote, setStatus } from "../actions";
import { StatusBadge } from "../../status-badge";
import { formatDate } from "../../format";

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

  return (
    <>
      <Link href="/dashboard/applications" className="text-sm text-muted hover:underline">
        ← All applications
      </Link>

      <div className="mt-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{app.name}</h1>
          <p className="text-muted">
            {formatDate(app.arrivalDate)} to {formatDate(app.departureDate)} ·{" "}
            {app.partySize} {app.partySize === 1 ? "person" : "people"}
          </p>
        </div>
        <StatusBadge status={app.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card space-y-4 lg:col-span-2">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Email" value={<a href={`mailto:${app.email}`} className="text-accent hover:underline">{app.email}</a>} />
            <Detail label="Phone" value={app.phone} />
            <Detail label="Pronouns" value={app.pronouns} />
            <Detail label="Applied" value={formatDate(app.createdAt)} />
          </dl>
          <dl className="space-y-4 border-t border-line pt-4">
            <Detail label="About them" value={app.about} />
            <Detail label="Why they want to stay" value={app.reason} />
            <Detail label="Connection to the house" value={app.connection} />
            <Detail label="Dietary needs" value={app.dietaryNeeds} />
            <Detail label="Allergies" value={app.allergies} />
            <Detail label="Pets" value={app.pets} />
            <Detail label="Agreed to house rules" value={app.agreedToRules ? "Yes" : "No"} />
          </dl>
        </section>

        <aside className="space-y-6">
          <section className="card">
            <h2 className="legend mb-3">Decision</h2>
            <form action={setStatus.bind(null, app.id)} className="flex flex-wrap gap-2">
              {STATUSES.map((status) => (
                <button
                  key={status}
                  type="submit"
                  name="status"
                  value={status}
                  disabled={status === app.status}
                  className="btn-secondary capitalize"
                >
                  {status === "pending" ? "Back to pending" : status === "approved" ? "Approve" : "Decline"}
                </button>
              ))}
            </form>
          </section>

          <section className="card">
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
            <form action={addNote.bind(null, app.id)} className="mt-4 space-y-2 border-t border-line pt-4">
              <input name="author" required placeholder="Your name" defaultValue={reviewerName} className="input" />
              <textarea name="body" required rows={3} placeholder="Add a note or vote…" className="input" />
              <button type="submit" className="btn-primary w-full">Add note</button>
            </form>
          </section>
        </aside>
      </div>
    </>
  );
}
