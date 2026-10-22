"use client";

import { useState } from "react";
import { deleteStay } from "../../actions";

// Two taps, like deleting a trip, so a stray one can't lose a stay
export function DeleteStayButton({ stayId }: { stayId: number }) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="text-sm text-muted hover:text-danger hover:underline">
        Delete stay
      </button>
    );
  }
  return (
    <form action={deleteStay.bind(null, stayId)} className="flex flex-wrap items-center gap-2">
      <span className="text-sm">Take this stay off the calendar?</span>
      <button type="submit" className="btn-secondary border-danger text-danger hover:border-danger">
        Delete
      </button>
      <button type="button" onClick={() => setAsking(false)} className="btn-secondary">
        Keep it
      </button>
    </form>
  );
}
