import { describe, expect, it } from "vitest";
import type { RegularPayment } from "./actual";
import { botSummary, botTokenMatches } from "./bot-summary";

describe("botTokenMatches", () => {
  it("accepts the right bearer token", () => {
    expect(botTokenMatches("Bearer s3cret-token", "s3cret-token")).toBe(true);
  });

  it("turns away a wrong, missing or malformed token", () => {
    expect(botTokenMatches("Bearer wrong", "s3cret-token")).toBe(false);
    expect(botTokenMatches(null, "s3cret-token")).toBe(false);
    expect(botTokenMatches("s3cret-token", "s3cret-token")).toBe(false);
  });

  it("is off when BOT_API_TOKEN isn't set, even for an empty bearer", () => {
    expect(botTokenMatches("Bearer ", undefined)).toBe(false);
    expect(botTokenMatches("Bearer ", "")).toBe(false);
  });
});

const share: RegularPayment = {
  payee: "Sam",
  expected: 65000,
  usualDay: 1,
  paid: 65000,
  lastPaidOn: "2026-10-01",
  status: "paid",
  daysLate: 0,
};

describe("botSummary", () => {
  const base = { today: "2026-10-18", bins: [], pendingApplications: 0, stays: [], shares: null };

  it("gives guests' first names only and marks which stays are confirmed", () => {
    const summary = botSummary({
      ...base,
      stays: [
        { id: 1, name: "Ana María López", partySize: 2, arrivalDate: "2026-10-20", departureDate: "2026-10-22", status: "approved" },
        { id: 2, name: " Joe ", partySize: 1, arrivalDate: "2026-10-25", departureDate: "2026-10-26", status: "pending" },
        { id: 3, name: "Declined Guest", partySize: 1, arrivalDate: "2026-10-25", departureDate: "2026-10-26", status: "declined" },
      ],
    });
    expect(summary.stays).toEqual([
      { firstName: "Ana", partySize: 2, arrivalDate: "2026-10-20", departureDate: "2026-10-22", confirmed: true },
      { firstName: "Joe", partySize: 1, arrivalDate: "2026-10-25", departureDate: "2026-10-26", confirmed: false },
    ]);
  });

  it("keeps who has paid but leaves out every amount", () => {
    const summary = botSummary({ ...base, shares: [share, { ...share, payee: "Kit", paid: 0, lastPaidOn: null, status: "late", daysLate: 5 }] });
    expect(summary.shares).toEqual([
      { name: "Sam", status: "paid", usualDay: 1, lastPaidOn: "2026-10-01", daysLate: 0 },
      { name: "Kit", status: "late", usualDay: 1, lastPaidOn: null, daysLate: 5 },
    ]);
    expect(JSON.stringify(summary)).not.toContain("65000");
  });

  it("says null when money isn't available, and keeps two bin days", () => {
    const bins = [
      { date: "2026-10-20", bins: ["Recycling"] },
      { date: "2026-10-27", bins: ["Rubbish"] },
      { date: "2026-11-03", bins: ["Recycling"] },
    ];
    const summary = botSummary({ ...base, bins });
    expect(summary.shares).toBeNull();
    expect(summary.bins).toEqual(bins.slice(0, 2));
  });
});
