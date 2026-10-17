import { describe, expect, it } from "vitest";
import {
  monthsBefore,
  pickAccounts,
  regularPayments,
  summarise,
  type ActualData,
  type ActualTransaction,
} from "./actual";

describe("pickAccounts", () => {
  const accounts = [
    { id: "a", name: "House account" },
    { id: "b", name: "House pot" },
    { id: "c", name: "Old account", closed: true },
  ];

  it("keeps every open account when none are named", () => {
    expect(pickAccounts(accounts, undefined).map((a) => a.id)).toEqual(["a", "b"]);
    expect(pickAccounts(accounts, " ").map((a) => a.id)).toEqual(["a", "b"]);
  });

  it("keeps only the named accounts, ignoring case and spaces", () => {
    expect(pickAccounts(accounts, "house POT , Old account").map((a) => a.id)).toEqual(["b", "c"]);
  });
});

const txn = (id: string, date: string, amount: number, extra: Partial<ActualTransaction> = {}): ActualTransaction => ({
  id,
  account: "house",
  date,
  amount,
  payee: null,
  category: null,
  ...extra,
});

const data = (transactions: ActualTransaction[]): ActualData => ({
  accounts: [{ id: "house", name: "House account" }],
  balances: { house: 123_45 },
  transactions,
  payees: [
    { id: "simon", name: "Simon" },
    { id: "jo", name: "Jo" },
    { id: "shop", name: "Sainsbury's" },
    { id: "pot", name: "House pot" },
  ],
  categories: [
    { id: "food", name: "Groceries" },
    { id: "clean", name: "Cleaning" },
  ],
});

describe("summarise", () => {
  it("totals this month's money in, and money out by category", () => {
    const result = summarise(
      data([
        txn("1", "2026-10-02", 150_00, { payee: "simon" }),
        txn("2", "2026-10-03", 150_00, { payee: "jo" }),
        txn("3", "2026-10-04", 50_00, { payee: "simon" }),
        txn("4", "2026-10-05", -40_00, { payee: "shop", category: "food" }),
        txn("5", "2026-10-06", -10_00, { payee: "shop" }),
        // Last month: left out of the totals
        txn("6", "2026-09-30", -99_00, { payee: "shop", category: "food" }),
      ]),
      "2026-10-16",
    );
    expect(result.month).toBe("2026-10");
    expect(result.moneyIn).toBe(350_00);
    expect(result.moneyOut).toBe(50_00);
    expect(result.spending).toEqual([
      { category: "Groceries", amount: 40_00 },
      { category: "Uncategorised", amount: 10_00 },
    ]);
    expect(result.accounts).toEqual([{ name: "House account", balance: 123_45 }]);
  });

  it("counts each part of a split payment under its own category", () => {
    const result = summarise(
      data([
        txn("1", "2026-10-05", -60_00, {
          payee: "shop",
          subtransactions: [
            txn("1a", "2026-10-05", -45_00, { category: "food" }),
            txn("1b", "2026-10-05", -15_00, { category: "clean" }),
          ],
        }),
      ]),
      "2026-10-16",
    );
    expect(result.moneyOut).toBe(60_00);
    expect(result.spending).toEqual([
      { category: "Groceries", amount: 45_00 },
      { category: "Cleaning", amount: 15_00 },
    ]);
    expect(result.recent[0]).toMatchObject({ payee: "Sainsbury's", category: "Split", amount: -60_00 });
  });

  it("leaves transfers and the opening balance out of money in and out", () => {
    const result = summarise(
      data([
        txn("1", "2026-10-01", 500_00, { starting_balance_flag: true }),
        txn("2", "2026-10-05", -100_00, { payee: "pot", transfer_id: "x" }),
      ]),
      "2026-10-16",
    );
    expect(result.moneyIn).toBe(0);
    expect(result.moneyOut).toBe(0);
    expect(result.recent.map((t) => t.payee)).toEqual(["Transfer to House pot"]);
  });

  it("lists recent transactions newest first, only from the accounts shown", () => {
    const result = summarise(
      data([
        txn("old", "2026-09-20", -5_00, { payee: "shop", notes: "" }),
        txn("new", "2026-10-10", -7_00, { payee: "shop", category: "food", notes: "Milk" }),
        txn("other", "2026-10-11", -1_00, { account: "elsewhere" }),
      ]),
      "2026-10-16",
    );
    expect(result.recent).toEqual([
      { id: "new", date: "2026-10-10", account: "House account", payee: "Sainsbury's", category: "Groceries", notes: "Milk", amount: -7_00 },
      { id: "old", date: "2026-09-20", account: "House account", payee: "Sainsbury's", category: null, notes: null, amount: -5_00 },
    ]);
  });
});

describe("monthsBefore", () => {
  it("steps back across a year", () => {
    expect(monthsBefore("2026-10", 3)).toBe("2026-07");
    expect(monthsBefore("2026-02", 3)).toBe("2025-11");
  });
});

const pay = (payee: string, date: string, pounds: number) => ({ payee, date, amount: Math.round(pounds * 100) });

describe("regularPayments", () => {
  const history = [
    // Simon pays £820 on the 1st, Jo £700 on the 5th, Priya £790 on the 28th
    ...["07", "08", "09"].flatMap((m) => [
      pay("Simon", `2026-${m}-01`, 820),
      pay("Jo", `2026-${m}-05`, 700),
      pay("Priya", `2026-${m}-28`, 790),
    ]),
    // Alex has paid two of the three months: still regular
    pay("Alex", "2026-08-02", 760),
    pay("Alex", "2026-09-02", 760),
    // A one-off refund isn't a share
    pay("Refund", "2026-09-14", 12),
  ];

  it("learns each share and says how this month is going", () => {
    const shares = regularPayments(
      [...history, pay("Simon", "2026-10-01", 820), pay("Alex", "2026-10-02", 400)],
      "in",
      "2026-10-17",
    );
    expect(shares).toEqual([
      { payee: "Simon", expected: 820_00, usualDay: 1, paid: 820_00, lastPaidOn: "2026-10-01", status: "paid", daysLate: 0 },
      { payee: "Alex", expected: 760_00, usualDay: 2, paid: 400_00, lastPaidOn: "2026-10-02", status: "part-paid", daysLate: 15 },
      { payee: "Jo", expected: 700_00, usualDay: 5, paid: 0, lastPaidOn: null, status: "late", daysLate: 12 },
      { payee: "Priya", expected: 790_00, usualDay: 28, paid: 0, lastPaidOn: null, status: "due", daysLate: 0 },
    ]);
  });

  it("adds up a share paid in two parts, and allows a pound either way", () => {
    const jo = history.filter((p) => p.payee === "Jo");
    const [result] = regularPayments(
      [...jo, pay("Jo", "2026-10-04", 350), pay("Jo", "2026-10-06", 349.5)],
      "in",
      "2026-10-17",
    );
    expect(result).toMatchObject({ paid: 699_50, status: "paid", lastPaidOn: "2026-10-06" });
  });

  it("gives a few days' grace before calling a payment late", () => {
    const jo = (today: string) => regularPayments(history.filter((p) => p.payee === "Jo"), "in", today)[0].status;
    expect(jo("2026-10-08")).toBe("due");
    expect(jo("2026-10-09")).toBe("late");
  });

  it("finds monthly bills by one payment a month, and leaves out shops visited more often", () => {
    const bills = regularPayments(
      [
        ...["07", "08", "09"].flatMap((m) => [
          pay("Michael Morris", `2026-${m}-03`, -2600),
          pay("Octopus Energy", `2026-${m}-08`, -(150 + Number(m))),
          pay("Sainsbury's", `2026-${m}-04`, -40),
          pay("Sainsbury's", `2026-${m}-18`, -55),
        ]),
        pay("Michael Morris", "2026-10-03", -2600),
        // Octopus took less this month: still paid
        pay("Octopus Energy", "2026-10-08", -90),
        // Money in from a payee doesn't make it a bill
        pay("Simon", "2026-09-01", 820),
      ],
      "out",
      "2026-10-17",
    );
    expect(bills.map((b) => [b.payee, b.expected, b.status])).toEqual([
      ["Michael Morris", 2600_00, "paid"],
      ["Octopus Energy", 159_00, "paid"],
    ]);
  });

  it("moves a share due on the 31st to the last day of a shorter month", () => {
    const sam = ["2026-08-31", "2026-10-31"].map((date) => pay("Sam", date, 500));
    expect(regularPayments(sam, "in", "2026-11-30")[0]).toMatchObject({ usualDay: 31, status: "due", daysLate: 0 });
  });
});
