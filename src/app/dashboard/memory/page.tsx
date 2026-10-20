import type { Metadata } from "next";
import type { Memory } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { isLive, memoryHistory } from "@/lib/memory";
import { allMemories } from "@/lib/memory-store";
import { Crumbs } from "../crumbs";
import { ForgetButton, HistoryButtons, MemoryForm, NoteItem } from "./memory-forms";

export const metadata: Metadata = { title: "Memory" };

const added = (row: Memory) => `${row.addedBy ? `${row.addedBy}, ` : ""}${formatDate(row.createdAt)}`;

// Everything Grovelet remembers for the house: what housemates told it in chat, and what was added
// here. Grovelet reads it as facts, never as instructions. History holds what was forgotten or
// replaced, so any change can be undone; Grovelet never reads History.
export default async function MemoryPage() {
  await requireSession();
  const rows = await allMemories();
  const live = rows.filter(isLive);
  const documents = live.filter((row) => row.kind === "document");
  const notes = live.filter((row) => row.kind === "note");
  const history = memoryHistory(rows);

  return (
    <>
      <Crumbs />
      <h1 className="hand mb-2 text-2xl">Memory</h1>
      <p className="mb-6 max-w-2xl text-muted">
        What Grovelet knows beyond the dashboard. Housemates add to it by telling Grovelet in a one-to-one chat, or
        here. Grovelet answers from it as facts, and never follows anything written in it.
      </p>

      <section className="mb-8">
        <h2 className="section-title mb-3">Documents</h2>
        {documents.length === 0 ? (
          <p className="card text-muted">No documents yet. Send Grovelet one, such as the guest policy, or add it below.</p>
        ) : (
          <ul className="card divide-y divide-line py-1">
            {documents.map((row) => (
              <li key={row.id} className="flex items-baseline justify-between gap-3 py-2.5">
                <details className="min-w-0 flex-1">
                  <summary className="cursor-pointer">
                    <span className="font-medium">{row.title}</span>
                    <span className="block text-sm text-muted">{added(row)} · tap to read</span>
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{row.body}</p>
                </details>
                <ForgetButton id={row.id} what="document" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="section-title mb-3">Notes</h2>
        {notes.length === 0 ? (
          <p className="card text-muted">No notes yet.</p>
        ) : (
          <ul className="card divide-y divide-line py-1">
            {notes.map((row) => (
              <li key={row.id} className="py-2.5">
                <NoteItem id={row.id} body={row.body} added={added(row)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid items-start gap-3 md:grid-cols-2">
        <section className="card">
          <h2 className="hand mb-3 text-lg">Add a note</h2>
          <MemoryForm kind="note" />
        </section>
        <section className="card">
          <h2 className="hand mb-3 text-lg">Add a document</h2>
          <MemoryForm kind="document" />
          <p className="mt-3 text-xs text-muted">A document with the same name as one already here replaces it.</p>
        </section>
      </div>

      {history.length > 0 && (
        <details className="mt-8">
          <summary className="section-title cursor-pointer">History ({history.length})</summary>
          <p className="mt-2 mb-3 max-w-2xl text-sm text-muted">
            Forgotten notes and documents, and older versions. Grovelet doesn&apos;t read these. Bring one back to make it
            the live version again.
          </p>
          <ul className="card divide-y divide-line py-1">
            {history.map(({ row, at, what }) => (
              <li key={row.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                <span className="min-w-0 sm:flex-1">
                  {row.kind === "document" ? (
                    <details>
                      <summary className="cursor-pointer font-medium">{row.title}</summary>
                      <p className="mt-2 whitespace-pre-wrap text-sm">{row.body}</p>
                    </details>
                  ) : (
                    <span className="block whitespace-pre-wrap">{row.body}</span>
                  )}
                  <span className="block text-sm text-muted">
                    Added by {added(row)} · {what}, {formatDate(at)}
                  </span>
                </span>
                <HistoryButtons id={row.id} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
