"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { DOCUMENT_LIMIT, NOTE_LIMIT } from "@/lib/memory";
import { addMemory, deleteMemory, editNote, forget, restore, type MemoryFormState } from "./actions";

// Add a note, or a document such as the guest policy. Clears itself once saved.
export function MemoryForm({ kind }: { kind: "note" | "document" }) {
  const [state, action, pending] = useActionState(addMemory.bind(null, kind), undefined);
  const form = useRef<HTMLFormElement>(null);
  const errors = state && "errors" in state ? state.errors : {};
  useEffect(() => {
    if (state && "saved" in state) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action} className="grid gap-3">
      {kind === "document" && (
        <label>
          <span className="label">Name</span>
          <input name="title" required maxLength={80} placeholder="e.g. Guest policy" className="input" />
          {errors.title && <p className="error">{errors.title}</p>}
        </label>
      )}
      <label>
        <span className="label">{kind === "note" ? "Note" : "Text"}</span>
        <textarea
          name="body"
          required
          maxLength={kind === "note" ? NOTE_LIMIT : DOCUMENT_LIMIT}
          rows={kind === "note" ? 2 : 8}
          placeholder={kind === "note" ? "e.g. The boiler resets with the red button under the stairs" : "Paste the whole document"}
          className="input"
        />
        {errors.body && <p className="error">{errors.body}</p>}
      </label>
      <div>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : kind === "note" ? "Add note" : "Add document"}
        </button>
      </div>
    </form>
  );
}

// A note with Edit and Forget. The old wording of an edited note goes to History.
export function NoteItem({ id, body, added }: { id: number; body: string; added: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(async (prev: MemoryFormState, formData: FormData) => {
    const result = await editNote(id, prev, formData);
    if (result && "saved" in result) setEditing(false);
    return result;
  }, undefined);
  const errors = state && "errors" in state ? state.errors : {};

  if (editing) {
    return (
      <form action={action} className="grid gap-2">
        <textarea name="body" required maxLength={NOTE_LIMIT} rows={2} defaultValue={body} className="input" />
        {errors.body && <p className="error">{errors.body}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    );
  }
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="min-w-0">
        <span className="block whitespace-pre-wrap">{body}</span>
        <span className="block text-sm text-muted">{added}</span>
      </span>
      <span className="flex shrink-0 items-baseline gap-3">
        <button type="button" onClick={() => setEditing(true)} className="text-sm text-muted hover:text-pillar hover:underline">
          Edit
        </button>
        <ForgetButton id={id} what="note" />
      </span>
    </div>
  );
}

// Two taps, so a stray one can't hide something. It can be brought back from History.
export function ForgetButton({ id, what }: { id: number; what: string }) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="shrink-0 text-sm text-muted hover:text-danger hover:underline">
        Forget
      </button>
    );
  }
  return (
    <form action={forget.bind(null, id)} className="flex shrink-0 flex-wrap items-center gap-2">
      <span className="text-sm">Forget this {what}? It moves to History.</span>
      <button type="submit" className="btn-secondary border-danger text-danger hover:border-danger">
        Forget
      </button>
      <button type="button" onClick={() => setAsking(false)} className="btn-secondary">
        Keep it
      </button>
    </form>
  );
}

// Bring back, or delete for good (two taps: that one can't be undone)
export function HistoryButtons({ id }: { id: number }) {
  const [asking, setAsking] = useState(false);

  if (asking) {
    return (
      <form action={deleteMemory.bind(null, id)} className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="text-sm">Delete for good? This can&apos;t be undone.</span>
        <button type="submit" className="btn-secondary border-danger text-danger hover:border-danger">
          Delete
        </button>
        <button type="button" onClick={() => setAsking(false)} className="btn-secondary">
          Keep it
        </button>
      </form>
    );
  }
  return (
    <span className="flex shrink-0 items-baseline gap-3">
      <form action={restore.bind(null, id)}>
        <button type="submit" className="text-sm text-muted hover:text-pillar hover:underline">
          Bring back
        </button>
      </form>
      <button type="button" onClick={() => setAsking(true)} className="text-sm text-muted hover:text-danger hover:underline">
        Delete for good
      </button>
    </span>
  );
}
