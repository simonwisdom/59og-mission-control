import { describe, expect, it } from "vitest";
import { pickAccounts, summarise, type ActualData, type ActualTransaction } from "./actual";

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
  it("totals this month's money in by payee and money out by category", () => {
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
    expect(result.paidIn).toEqual([
      { payee: "Simon", amount: 200_00 },
      { payee: "Jo", amount: 150_00 },
    ]);
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
