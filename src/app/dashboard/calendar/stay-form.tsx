"use client";

import { useActionState } from "react";
import type { StayInput } from "@/lib/stays";
import { saveStay } from "./actions";

// Add a housemate's own guest, or change one when `stay` is given. `people` are housemates' names
// from earlier trips and stays, offered as suggestions so each is spelt the same way each time.
export function StayForm({
  stay,
  defaults,
  people,
}: {
  stay?: StayInput & { id: number };
  defaults?: Partial<StayInput>;
  people: string[];
}) {
  const [state, action, pending] = useActionState(saveStay.bind(null, stay?.id ?? null), undefined);
  const errors = state?.errors ?? {};
  const values = stay ?? defaults ?? {};

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label>
        <span className="label">Guest</span>
        <input name="name" required maxLength={200} placeholder="Their name" defaultValue={values.name ?? ""} className="input" />
        {errors.name && <p className="error">{errors.name}</p>}
      </label>
      <label>
        <span className="label">People</span>
        <input type="number" name="partySize" required min={1} max={20} defaultValue={values.partySize ?? 1} className="input" />
        {errors.partySize && <p className="error">{errors.partySize}</p>}
      </label>
      <label>
        <span className="label">Arriving</span>
        <input type="date" name="arrivalDate" required defaultValue={values.arrivalDate ?? ""} className="input" />
        {errors.arrivalDate && <p className="error">{errors.arrivalDate}</p>}
      </label>
      <label>
        <span className="label">Departing</span>
        <input type="date" name="departureDate" required defaultValue={values.departureDate ?? ""} className="input" />
        {errors.departureDate && <p className="error">{errors.departureDate}</p>}
      </label>
      <label className="sm:col-span-2">
        <span className="label">Whose guest</span>
        <input name="addedBy" required maxLength={40} list="stay-people" placeholder="Your first name" defaultValue={values.addedBy ?? ""} className="input" />
        <datalist id="stay-people">
          {people.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        {errors.addedBy && <p className="error">{errors.addedBy}</p>}
      </label>
      <div>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : stay ? "Save changes" : "Add stay"}
        </button>
      </div>
    </form>
  );
}
