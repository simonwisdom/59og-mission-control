import { describe, expect, it } from "vitest";
import { matchPayment, normaliseReference, parsePounds, rentSummary, type PaymentRule } from "./rent";

const couple = { id: 1, name: "Simon & Paulina", rent: 1442_86, bills: 362_00 };
const bryan = { id: 2, name: "Bryan", rent: 806_18, bills: 181_00 };
const rita = { id: 3, name: "Rita", rent: 806_18, bills: 181_00 };
const housemates = [couple, bryan, rita];
const rules: PaymentRule[] = [
  { reference: "rent", housemateId: 1 },
  { reference: "bills", housemateId: 1 },
  { reference: "rent", housemateId: 2 },
  { reference: "bills", housemateId: 2 },
  { reference: "rita rent", housemateId: 3 },
  { reference: "rita bills", housemateId: 3 },
  { reference: "21day accomodation", housemateId: null },
];
const pay = (id: string, date: string, amount: number, reference: string) => ({ id, date, amount, reference });

describe("normaliseReference", () => {
  it("drops case, punctuation, months and years", () => {
    expect(normaliseReference("RENT")).toBe("rent");
    expect(normaliseReference("rent oct")).toBe("rent");
    expect(normaliseReference("Rent - November 2026!")).toBe("rent");
    expect(normaliseReference("Rita  bills")).toBe("rita bills");
    expect(normaliseReference("59OG JOINT ACCT")).toBe("59og joint acct");
  });
});

describe("parsePounds", () => {
  it("reads pounds as pence", () => {
    expect(parsePounds("£1,442.86")).toBe(1442_86);
    expect(parsePounds(" 806 ")).toBe(806_00);
    expect(parsePounds("181.5")).toBe(181_50);
  });

  it("refuses anything that isn't an amount", () => {
    expect(parsePounds("")).toBeNull();
    expect(parsePounds("-5")).toBeNull();
    expect(parsePounds("12.345")).toBeNull();
    expect(parsePounds("lots")).toBeNull();
  });
});

describe("matchPayment", () => {
  it("matches a reference only one housemate has", () => {
    expect(matchPayment(pay("a", "2026-11-03", 806_18, "Rita rent"), housemates, rules)).toEqual({ housemate: rita });
  });

  it("tells apart two housemates with one reference by the amount", () => {
    expect(matchPayment(pay("a", "2026-11-01", 1442_86, "rent"), housemates, rules)).toEqual({ housemate: couple });
    expect(matchPayment(pay("b", "2026-11-02", 806_18, "RENT"), housemates, rules)).toEqual({ housemate: bryan });
    expect(matchPayment(pay("c", "2026-10-02", 362_00, "bills oct"), housemates, rules)).toEqual({ housemate: couple });
    expect(matchPayment(pay("d", "2026-11-02", 181_00, "BILLS"), housemates, rules)).toEqual({ housemate: bryan });
  });

  it("leaves a shared reference unmatched when the amount fits nobody", () => {
    expect(matchPayment(pay("a", "2026-11-01", 50_00, "rent"), housemates, rules)).toBeNull();
  });

  it("knows references that are nobody's rent, and leaves new ones unmatched", () => {
    expect(matchPayment(pay("a", "2026-08-03", 1260_00, "21day Accomodation"), housemates, rules)).toEqual({ notRent: true });
    expect(matchPayment(pay("b", "2026-10-18", 30_00, "Ronan Harrington"), housemates, rules)).toBeNull();
    expect(matchPayment(pay("c", "2026-10-18", 30_00, ""), housemates, rules)).toBeNull();
  });
});

describe("rentSummary", () => {
  const history = [
    pay("o1", "2026-10-01", 1442_86, "rent oct"),
    pay("o2", "2026-10-02", 362_00, "bills oct"),
    pay("o3", "2026-10-01", 806_18, "RENT"),
    pay("o4", "2026-10-01", 181_00, "BILLS"),
    pay("o5", "2026-10-08", 823_00, "Rita rent"),
    pay("o6", "2026-10-03", 181_00, "Rita bills"),
  ];

  it("adds up each housemate's rent and bills this month against what they owe", () => {
    const { shares } = rentSummary(
      [
        ...history,
        pay("n1", "2026-11-01", 1442_86, "rent"),
        pay("n2", "2026-11-01", 362_00, "bills"),
        pay("n3", "2026-11-02", 806_18, "RENT"),
      ],
      housemates,
      rules,
      "2026-11-04",
    );
    expect(shares.map((s) => [s.payee, s.status, s.paid, s.expected, s.usualDay])).toEqual([
      ["Bryan", "part-paid", 806_18, 987_18, 1],
      ["Simon & Paulina", "paid", 1804_86, 1804_86, 1],
      ["Rita", "due", 0, 987_18, 3],
    ]);
    expect(shares[1].lastPaidOn).toBe("2026-11-01");
  });

  it("shows a housemate as late three days after their usual day", () => {
    // Rita's first payment of the month comes on the 3rd
    const { shares } = rentSummary(history, [rita], rules, "2026-11-07");
    expect(shares[0]).toMatchObject({ status: "late", daysLate: 4 });
  });

  it("lists this month's and last month's payments nobody has claimed, newest first", () => {
    const { unmatched } = rentSummary(
      [
        pay("x", "2026-09-07", 198_00, "Alexander Lai"),
        pay("y", "2026-10-18", 30_00, "Ronan Harrington"),
        pay("z", "2026-11-01", 160_00, "Og"),
        pay("g", "2026-11-01", 1260_00, "21day Accomodation"),
        pay("r", "2026-11-03", 806_18, "Rita rent"),
      ],
      housemates,
      rules,
      "2026-11-04",
    );
    expect(unmatched.map((p) => p.id)).toEqual(["z", "y"]);
  });
});
