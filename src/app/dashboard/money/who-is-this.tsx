import type { Housemate, IncomingPayment } from "@/lib/rent";
import { formatPence } from "@/lib/format";
import { matchReference } from "./actions";

const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const short = (date: string) => shortDate.format(new Date(`${date}T00:00:00Z`));

// Payments in that aren't anyone's yet. Picking whose one is saves its reference, so later payments
// with the same reference match without asking again.
export function WhoIsThis({ payments, housemates }: { payments: IncomingPayment[]; housemates: Housemate[] }) {
  if (payments.length === 0) return null;
  return (
    <section className="card mt-3" id="who-is-this">
      <h2 className="legend">Who&apos;s this?</h2>
      <p className="mt-1 text-sm text-muted">
        Payments in this month or last that aren&apos;t matched to anyone. Pick whose each is, once; later payments with
        the same reference match by themselves.
      </p>
      <ul className="mt-2 divide-y divide-line">
        {payments.map((payment) => (
          <li key={payment.id} className="py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate font-medium">{payment.reference || "No reference"}</p>
              <p className="shrink-0 tabular-nums">{formatPence(payment.amount)}</p>
            </div>
            <form action={matchReference.bind(null, payment.reference)} className="mt-1.5 flex items-center gap-2">
              <span className="text-sm text-muted">{short(payment.date)}</span>
              <select
                name="housemate"
                required
                defaultValue=""
                aria-label={`Whose is ${payment.reference}?`}
                className="input-inline min-w-0 flex-1 text-sm"
              >
                <option value="" disabled>
                  Whose is it?
                </option>
                {housemates.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
                <option value="none">Not rent or bills</option>
              </select>
              <button type="submit" className="btn-secondary shrink-0">
                Save
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
