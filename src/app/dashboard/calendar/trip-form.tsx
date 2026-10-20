"use client";

import { useActionState } from "react";
import type { TripDates } from "@/lib/trips";
import { saveTrip } from "./actions";

// Add a trip, or change one when `trip` is given. `people` are names from earlier trips, offered
// as suggestions so the same housemate is spelt the same way each time.
export function TripForm({
  trip,
  defaults,
  people,
}: {
  trip?: TripDates & { id: number };
  defaults?: Partial<TripDates>;
  people: string[];
}) {
  const [state, action, pending] = useActionState(saveTrip.bind(null, trip?.id ?? null), undefined);
  const errors = state?.errors ?? {};
  const values = trip ?? defaults ?? {};

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className="label">Who</span>
        <input name="person" required maxLength={40} list="trip-people" placeholder="First name" defaultValue={values.person ?? ""} className="input" />
        <datalist id="trip-people">
          {people.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        {errors.person && <p className="error">{errors.person}</p>}
      </label>
      <label>
        <span className="label">Leaving</span>
        <input type="date" name="leaveDate" required defaultValue={values.leaveDate ?? ""} className="input" />
        {errors.leaveDate && <p className="error">{errors.leaveDate}</p>}
      </label>
      <label>
        <span className="label">Back</span>
        <input type="date" name="backDate" required defaultValue={values.backDate ?? ""} className="input" />
        {errors.backDate && <p className="error">{errors.backDate}</p>}
      </label>
      <label className="sm:col-span-2">
        <span className="label">Where (optional)</span>
        <input name="place" maxLength={100} placeholder="e.g. Lisbon" defaultValue={values.place ?? ""} className="input" />
        {errors.place && <p className="error">{errors.place}</p>}
      </label>
      <div>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : trip ? "Save changes" : "Add trip"}
        </button>
      </div>
    </form>
  );
}
