import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { housemates, paymentRules } from "@/db/schema";
import { formatPence } from "@/lib/format";
import { Crumbs } from "../../crumbs";
import { deleteHousemate, deleteReference } from "../actions";
import { HousemateForm } from "./housemate-form";

export const metadata: Metadata = { title: "Housemates and rent" };

// A reference as the list shows it: "rita rent" → "Rita rent"
const shown = (reference: string) => reference.charAt(0).toUpperCase() + reference.slice(1);

function References({ rules }: { rules: { id: number; reference: string }[] }) {
  if (rules.length === 0) {
    return <p className="mt-2 text-sm text-muted">None yet. They&apos;re picked under Who&apos;s this? on House money.</p>;
  }
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {rules.map((rule) => (
        <li key={rule.id}>
          <form action={deleteReference.bind(null, rule.id)} className="flex items-center gap-1 rounded-full border border-line py-0.5 pr-1 pl-2.5 text-sm">
            <span>{shown(rule.reference)}</span>
            <button type="submit" aria-label={`Forget ${rule.reference}`} className="rounded-full px-1.5 text-muted hover:text-danger">
              ×
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}

export default async function HousematesPage() {
  const [people, rules] = await Promise.all([
    db.select().from(housemates).orderBy(asc(housemates.name)),
    db.select().from(paymentRules).orderBy(asc(paymentRules.reference)),
  ]);
  const notRent = rules.filter((rule) => rule.housemateId === null);
  const total = people.reduce((sum, h) => sum + h.rent, 0);

  return (
    <>
      <Crumbs trail={[{ label: "House money", href: "/dashboard/money" }]} />
      <h1 className="hand mb-2 text-2xl">Housemates and rent</h1>
      <p className="mb-6 max-w-2xl text-muted">
        What each housemate pays in a month, and the payment references that are theirs. The bank only tells us the
        reference someone typed, not who sent it, so House money matches payments by these. A couple sharing a room can
        be one housemate.
      </p>

      <ul className="grid gap-3">
        {people.map((h) => (
          <li key={h.id} className="card">
            <HousemateForm housemate={h} />
            <h2 className="legend mt-4">Their references</h2>
            <References rules={rules.filter((rule) => rule.housemateId === h.id)} />
            <form action={deleteHousemate.bind(null, h.id)} className="mt-3 border-t border-line pt-3">
              <button type="submit" className="text-sm text-muted hover:text-danger">
                Remove {h.name}
              </button>
            </form>
          </li>
        ))}
        <li className="card">
          <HousemateForm />
        </li>
      </ul>
      {people.length > 0 && (
        <p className="mt-2 text-sm text-muted">Rent comes to {formatPence(total)} a month in all.</p>
      )}

      <section className="card mt-6">
        <h2 className="legend">Not rent or bills</h2>
        <p className="mt-1 text-sm text-muted">References that are nobody&apos;s rent, such as a guest paying for a stay.</p>
        <References rules={notRent} />
      </section>
    </>
  );
}
