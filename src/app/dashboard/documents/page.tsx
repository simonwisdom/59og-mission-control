import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { houseDocuments } from "@/db/schema";
import { daysUntil, expiryStatus, type ExpiryStatus } from "@/lib/documents";
import { formatDate, todayInLondon } from "@/lib/format";
import { addDocument, deleteDocument } from "./actions";

function Expiry({ expiresOn, status, today }: { expiresOn: string | null; status: ExpiryStatus; today: string }) {
  if (!expiresOn) return <span className="text-muted">No expiry</span>;
  const days = daysUntil(expiresOn, today);
  if (status === "expired") return <span className="font-medium text-danger">⚠ Expired {formatDate(expiresOn)}</span>;
  if (status === "soon") {
    return (
      <span className="font-medium text-pillar">
        ⏰ Due {formatDate(expiresOn)} ({days === 0 ? "today" : `in ${days} days`})
      </span>
    );
  }
  return <span className="text-muted">Valid until {formatDate(expiresOn)}</span>;
}

export default async function DocumentsPage() {
  const today = todayInLondon();
  // Soonest expiry first, then anything without a date
  const docs = await db
    .select()
    .from(houseDocuments)
    .orderBy(sql`${houseDocuments.expiresOn} asc nulls last`, asc(houseDocuments.name));

  return (
    <>
      <h1 className="hand mb-2 text-2xl">Key documents</h1>
      <p className="mb-6 text-sm text-muted">
        The files live in Google Drive. This list only keeps the link and the date each one needs renewing.
      </p>

      {docs.length === 0 ? (
        <p className="card text-muted">No documents yet. Add the tenancy agreement, gas safety certificate and so on below.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[2px] border border-line bg-surface">
          {docs.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                  {doc.name} ↗
                </a>
                <div className="text-sm">
                  <Expiry expiresOn={doc.expiresOn} status={expiryStatus(doc.expiresOn, today)} today={today} />
                </div>
              </div>
              <form action={deleteDocument.bind(null, doc.id)}>
                <button type="submit" className="text-xs text-muted hover:text-danger hover:underline">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <section className="card mt-8">
        <h2 className="legend">Add a document</h2>
        <form action={addDocument} className="mt-3 grid gap-2 sm:grid-cols-[1fr_2fr_auto_auto] sm:items-end">
          <label>
            <span className="hint">Name</span>
            <input name="name" required placeholder="Gas safety certificate" className="input" />
          </label>
          <label>
            <span className="hint">Google Drive link</span>
            <input type="url" name="url" required placeholder="https://drive.google.com/…" className="input" />
          </label>
          <label>
            <span className="hint">Expires (optional)</span>
            <input type="date" name="expiresOn" className="input" />
          </label>
          <button type="submit" className="btn-secondary h-9">Add</button>
        </form>
      </section>
    </>
  );
}
