"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { DOCUMENT_LIMIT, NOTE_LIMIT } from "@/lib/memory";
import { addMemory, deleteMemory } from "./actions";

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

// Two taps, like deleting a trip, so a stray one can't lose a memory
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
    <form action={deleteMemory.bind(null, id)} className="flex shrink-0 flex-wrap items-center gap-2">
      <span className="text-sm">Forget this {what}?</span>
      <button type="submit" className="btn-secondary border-danger text-danger hover:border-danger">
        Forget
      </button>
      <button type="button" onClick={() => setAsking(false)} className="btn-secondary">
        Keep it
      </button>
    </form>
  );
}
