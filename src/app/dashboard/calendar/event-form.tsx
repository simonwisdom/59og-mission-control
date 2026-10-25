"use client";

import { useActionState } from "react";
import type { EventFields } from "@/lib/events";
import { saveEvent } from "./actions";

// Add an event, or change one when `event` is given. `people` are housemates' names from earlier
// trips, stays and events, offered as suggestions so each is spelt the same way each time.
export function EventForm({
  event,
  defaults,
  people,
}: {
  event?: EventFields & { id: number };
  defaults?: Partial<EventFields>;
  people: string[];
}) {
  const [state, action, pending] = useActionState(saveEvent.bind(null, event?.id ?? null), undefined);
  const errors = state?.errors ?? {};
  const values = event ?? defaults ?? {};

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className="label">What&apos;s on</span>
        <input name="title" required maxLength={100} placeholder="e.g. Dinner at ours, or Jazz at the Vortex" defaultValue={values.title ?? ""} className="input" />
        {errors.title && <p className="error">{errors.title}</p>}
      </label>
      <label>
        <span className="label">Day</span>
        <input type="date" name="date" required defaultValue={values.date ?? ""} className="input" />
        {errors.date && <p className="error">{errors.date}</p>}
      </label>
      <label>
        <span className="label">Last day (if it runs longer)</span>
        <input type="date" name="endDate" defaultValue={values.endDate ?? ""} className="input" />
        {errors.endDate && <p className="error">{errors.endDate}</p>}
      </label>
      <label>
        <span className="label">Time (optional)</span>
        <input name="time" maxLength={30} placeholder="e.g. 8pm" defaultValue={values.time ?? ""} className="input" />
        {errors.time && <p className="error">{errors.time}</p>}
      </label>
      <label>
        <span className="label">Place (optional)</span>
        <input name="place" maxLength={100} placeholder="e.g. the garden" defaultValue={values.place ?? ""} className="input" />
        {errors.place && <p className="error">{errors.place}</p>}
      </label>
      <label className="sm:col-span-2">
        <span className="label">Link (optional)</span>
        <input type="url" name="link" maxLength={500} placeholder="https://" defaultValue={values.link ?? ""} className="input" />
        {errors.link && <p className="error">{errors.link}</p>}
      </label>
      <label className="sm:col-span-2">
        <span className="label">Added by</span>
        <input name="addedBy" required maxLength={40} list="event-people" placeholder="Your first name" defaultValue={values.addedBy ?? ""} className="input" />
        <datalist id="event-people">
          {people.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        {errors.addedBy && <p className="error">{errors.addedBy}</p>}
      </label>
      <div>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : event ? "Save changes" : "Add event"}
        </button>
      </div>
    </form>
  );
}
