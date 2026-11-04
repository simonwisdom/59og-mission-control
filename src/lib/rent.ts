// Matches the rent and bills housemates pay into the house account to the housemate who paid.
// The bank feed (Monzo through TrueLayer into Actual) carries only the reference the sender typed,
// such as "Rita rent" or "RENT", not who sent it. So each housemate has a list of references that are
// theirs, saved on the dashboard, and a payment counts for the housemate whose reference it carries.
// Two housemates can share a reference ("rent"); then the amount decides, since each pays a fixed
// rent and bills.
import { GRACE_DAYS, type RegularPayment } from "./actual";

// Amounts are whole pence
export type Housemate = { id: number; name: string; rent: number; bills: number };
// A reference that belongs to a housemate, or to nobody's rent or bills (housemateId null), as
// normaliseReference gives it
export type PaymentRule = { reference: string; housemateId: number | null };
// Money in, as positive pence; reference is the bank reference, or the payee when there's none
export type IncomingPayment = { id: string; date: string; amount: number; reference: string };

// Paid in full when within this much of rent plus bills, in pence
const TOLERANCE = 100;
// Amounts this close count as the same when telling apart two housemates with one reference
const AMOUNT_MATCH = 100;

const MONTH_WORDS = new Set([
  ..."jan feb mar apr may jun jul aug sep sept oct nov dec".split(" "),
  ..."january february march april june july august september october november december".split(" "),
]);

// "Rent Oct 2026" → "rent", "Rita  bills!" → "rita bills". Case, punctuation, months and years don't
// tell housemates apart, and people change them month to month.
export function normaliseReference(reference: string) {
  return reference
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word && !MONTH_WORDS.has(word) && !/^(19|20)\d\d$/.test(word))
    .join(" ");
}

// "£1,442.86" or "806" → pence, or null when it isn't an amount
export function parsePounds(text: string) {
  const cleaned = text.replace(/[£,\s]/g, "");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

export type Match ={ housemate: Housemate } | { notRent: true } | null;

// Whose rent or bills this payment is, that it's neither, or null when nobody's said yet or it
// can't be told apart
export function matchPayment(payment: IncomingPayment, housemates: Housemate[], rules: PaymentRule[]): Match {
  const reference = normaliseReference(payment.reference);
  if (!reference) return null;
  const owners = rules.filter((rule) => rule.reference === reference);
  if (owners.length === 0) return null;
  if (owners.some((rule) => rule.housemateId === null)) return { notRent: true };

  const candidates = housemates.filter((h) => owners.some((rule) => rule.housemateId === h.id));
  if (candidates.length === 1) return { housemate: candidates[0] };
  const close = (expected: number) => expected > 0 && Math.abs(payment.amount - expected) <= AMOUNT_MATCH;
  const byAmount = candidates.filter((h) => close(h.rent) || close(h.bills) || close(h.rent + h.bills));
  return byAmount.length === 1 ? { housemate: byAmount[0] } : null;
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
};

const daysIn = (month: string) => {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
};

export type RentSummary = {
  // One row per housemate, in order of the day they usually pay, as the share checklist shows them
  shares: RegularPayment[];
  // This month's and last month's payments nobody has said are anyone's yet, newest first
  unmatched: IncomingPayment[];
};

// How this month's rent and bills are going for each housemate. The usual day is learned from their
// payments in earlier months, the first of the month until there are some.
export function rentSummary(
  payments: IncomingPayment[],
  housemates: Housemate[],
  rules: PaymentRule[],
  today: string,
): RentSummary {
  const month = today.slice(0, 7);
  const day = Number(today.slice(8, 10));
  const lastMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 2, 1))
    .toISOString()
    .slice(0, 7);

  const byHousemate = new Map<number, IncomingPayment[]>();
  const unmatched: IncomingPayment[] = [];
  for (const payment of payments) {
    if (payment.amount <= 0) continue;
    const match = matchPayment(payment, housemates, rules);
    if (match && "housemate" in match) {
      byHousemate.set(match.housemate.id, [...(byHousemate.get(match.housemate.id) ?? []), payment]);
    } else if (!match && payment.date.slice(0, 7) >= lastMonth) {
      unmatched.push(payment);
    }
  }

  const shares = housemates.map((housemate): RegularPayment => {
    const theirs = (byHousemate.get(housemate.id) ?? []).sort((a, b) => a.date.localeCompare(b.date));
    const thisMonth = theirs.filter((p) => p.date.startsWith(month));
    const earlier = new Map<string, number>();
    for (const p of theirs) {
      const m = p.date.slice(0, 7);
      if (m < month && !earlier.has(m)) earlier.set(m, Number(p.date.slice(8, 10)));
    }
    const usualDay = earlier.size ? median([...earlier.values()]) : 1;
    const expected = housemate.rent + housemate.bills;
    const paid = thisMonth.reduce((sum, p) => sum + p.amount, 0);
    const daysLate = Math.max(day - Math.min(usualDay, daysIn(month)), 0);
    const status =
      paid >= expected - TOLERANCE ? "paid" : paid > 0 ? "part-paid" : daysLate > GRACE_DAYS ? "late" : "due";
    return {
      payee: housemate.name,
      expected,
      usualDay,
      paid,
      lastPaidOn: thisMonth.at(-1)?.date ?? null,
      status,
      daysLate: status === "paid" ? 0 : daysLate,
    };
  });

  return {
    shares: shares.sort((a, b) => a.usualDay - b.usualDay || a.payee.localeCompare(b.payee)),
    unmatched: unmatched.sort((a, b) => b.date.localeCompare(a.date)),
  };
}
