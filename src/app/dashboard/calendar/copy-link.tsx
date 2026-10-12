"use client";

import { useState } from "react";

export function CopyLink({ url, label = "Copy link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <button type="button" onClick={copy} className="cursor-pointer rounded-[2px] border border-line px-3 py-1.5 text-sm hover:border-tile">
      {copied ? "Copied" : label}
    </button>
  );
}
