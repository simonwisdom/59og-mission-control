"use client";

import { useState } from "react";
import { deleteTrip } from "../../actions";

// Two taps, like deleting an application, so a stray one can't lose a trip
export function DeleteTripButton({ tripId }: { tripId: number }) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="text-sm text-muted hover:text-danger hover:underline">
        Delete trip
      </button>
    );
  }
  return (
    <form action={deleteTrip.bind(null, tripId)} className="flex flex-wrap items-center gap-2">
      <span className="text-sm">Take this trip off the calendar?</span>
      <button type="submit" className="btn-secondary border-danger text-danger hover:border-danger">
        Delete
      </button>
      <button type="button" onClick={() => setAsking(false)} className="btn-secondary">
        Keep it
      </button>
    </form>
  );
}
