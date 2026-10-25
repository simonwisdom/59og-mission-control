"use client";

import { useState } from "react";
import { EventForm } from "./event-form";
import { StayForm } from "./stay-form";
import { TripForm } from "./trip-form";

const KINDS = [
  { key: "trip", label: "Trip away", hint: "So the house knows who's in." },
  { key: "guest", label: "Guest staying", hint: "A friend or family member staying with you. It goes on as confirmed, with no application." },
  { key: "event", label: "Event", hint: "Something you're hosting or going to that the house might like to know about." },
] as const;

export type AddKind = (typeof KINDS)[number]["key"];

// One place to add anything to the calendar: a switch between a trip, a guest and an event, with
// only that form showing. `me` fills in who's adding it.
export function AddPanel({ me, people, initial = "trip" }: { me: string; people: string[]; initial?: AddKind }) {
  const [kind, setKind] = useState<AddKind>(initial);
  const current = KINDS.find((k) => k.key === kind)!;

  return (
    <section id="add" className="card scroll-mt-4 border-2 border-ink/80">
      <h2 className="hand text-lg">Add to the calendar</h2>
      <div role="group" aria-label="What to add" className="mt-3 grid grid-cols-3 gap-1 rounded-[2px] border border-rule p-1">
        {KINDS.map(({ key, label }) => (
          <button key={key} type="button" onClick={() => setKind(key)} aria-pressed={kind === key} className="tab px-1 py-1.5 text-center">
            {label}
          </button>
        ))}
      </div>
      <p className="mt-3 mb-4 text-sm text-muted">{current.hint}</p>
      {kind === "trip" && <TripForm defaults={{ person: me }} people={people} />}
      {kind === "guest" && <StayForm defaults={{ addedBy: me }} people={people} />}
      {kind === "event" && <EventForm defaults={{ addedBy: me }} people={people} />}
      <p className="mt-4 text-xs text-muted">Grovelet can add any of these too, if you ask it in a chat.</p>
    </section>
  );
}
