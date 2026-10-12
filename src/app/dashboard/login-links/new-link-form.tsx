"use client";

import { useActionState, useState } from "react";
import { createLink } from "./actions";

// Make a login link and show it once, ready to copy or send to the housemate
export function NewLinkForm() {
  const [state, action, pending] = useActionState(createLink, undefined);
  const [copied, setCopied] = useState(false);
  const url = state && "key" in state ? `${window.location.origin}/login/${state.key}` : null;

  // If the clipboard is blocked, the link is still in the box to select by hand
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {}
  }

  return (
    <div className="card">
      <form action={action} onSubmit={() => setCopied(false)} className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="label">New link for</span>
          <input name="name" required maxLength={100} placeholder="e.g. Sam's phone" className="input" />
        </label>
        <button type="submit" disabled={pending} className="btn-primary py-1.5 text-sm">
          {pending ? "Making…" : "Make link"}
        </button>
      </form>
      {state && "error" in state && <p className="error">{state.error}</p>}
      {url && state && "name" in state && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-sm text-muted">
            Link for {state.name}. Send it to them privately: anyone who opens it gets in. It won&apos;t be shown again.
          </p>
          <input readOnly value={url} onFocus={(event) => event.target.select()} className="input mt-2 font-mono text-sm" />
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={() => copy(url)} className="btn-secondary">
              Copy link
            </button>
            <span aria-live="polite" className="text-sm text-ink-soft">
              {copied && "Copied"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
