"use client";

import { useActionState, useState } from "react";
import { createLink } from "./actions";

// Make a login link and show it once, with a QR code, ready to copy or save and share
export function NewLinkForm() {
  const [state, action, pending] = useActionState(createLink, undefined);
  const [copied, setCopied] = useState(false);
  const made = state && "url" in state ? state : null;

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
          <input name="name" required maxLength={100} placeholder="e.g. the house, or Sam" className="input" />
        </label>
        <button type="submit" disabled={pending} className="btn-primary py-1.5 text-sm">
          {pending ? "Making…" : "Make link"}
        </button>
      </form>
      {state && "error" in state && <p className="error">{state.error}</p>}
      {made && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-sm text-muted">
            Link for {made.name}. Share it only with housemates: anyone who opens it or scans the code gets in. It
            won&apos;t be shown again.
          </p>
          {/* The SVG comes from the qrcode library on the server, not from anything typed in */}
          <div
            className="mt-3 w-48 bg-white [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: made.qrSvg }}
          />
          <input readOnly value={made.url} onFocus={(event) => event.target.select()} className="input mt-3 font-mono text-sm" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => copy(made.url)} className="btn-secondary">
              Copy link
            </button>
            <a
              href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(made.qrSvg)}`}
              download="olive-grove-login-qr.svg"
              className="btn-secondary"
            >
              Save QR code
            </a>
            <span aria-live="polite" className="text-sm text-ink-soft">
              {copied && "Copied"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
