"use client";

import { useState } from "react";
import { deleteApplication } from "../actions";

// Deleting takes two taps, so a stray one can't lose an application. No browser
// confirm() dialog, since those look out of place and block the page.
export function DeleteButton({ applicationId, name }: { applicationId: number; name: string }) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="text-sm text-muted hover:text-danger hover:underline">
        Delete application
      </button>
    );
  }
  return (
    <form action={deleteApplication.bind(null, applicationId)} className="flex flex-wrap items-center gap-2">
      <span className="text-sm">Delete {name}&apos;s application and its notes for good?</span>
      <button type="submit" className="btn-secondary border-danger text-danger hover:border-danger">
        Delete
      </button>
      <button type="button" onClick={() => setAsking(false)} className="btn-secondary">
        Keep it
      </button>
    </form>
  );
}
