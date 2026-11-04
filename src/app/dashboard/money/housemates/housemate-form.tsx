"use client";

import { useActionState } from "react";
import { saveHousemate } from "../actions";

const pounds = (pence: number) => (pence / 100).toFixed(2);

// One housemate's name, rent and bills, or a blank one to add
export function HousemateForm({
  housemate,
}: {
  housemate?: { id: number; name: string; rent: number; bills: number };
}) {
  const [state, action, pending] = useActionState(saveHousemate.bind(null, housemate?.id ?? null), undefined);
  return (
    <form action={action}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
        <label className="col-span-2 sm:col-span-1">
          <span className="label">{housemate ? "Name" : "New housemate"}</span>
          <input
            name="name"
            required
            maxLength={100}
            defaultValue={housemate?.name}
            placeholder="e.g. Sam, or Sam & Jo"
            className="input"
          />
        </label>
        <label>
          <span className="label">Rent a month, £</span>
          <input
            name="rent"
            required
            inputMode="decimal"
            defaultValue={housemate ? pounds(housemate.rent) : ""}
            className="input tabular-nums"
          />
        </label>
        <label>
          <span className="label">Bills a month, £</span>
          <input
            name="bills"
            inputMode="decimal"
            defaultValue={housemate ? pounds(housemate.bills) : ""}
            className="input tabular-nums"
          />
        </label>
        <button type="submit" disabled={pending} className="btn-primary col-span-2 py-1.5 text-sm sm:col-span-1">
          {pending ? "Saving…" : housemate ? "Save" : "Add"}
        </button>
      </div>
      {state && "error" in state && <p className="error">{state.error}</p>}
      {state && "saved" in state && !pending && (
        <p aria-live="polite" className="mt-1 text-sm text-ink-soft">
          Saved
        </p>
      )}
    </form>
  );
}
