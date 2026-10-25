import { describe, expect, it } from "vitest";
import type { RegularPayment } from "./actual";
import { botSummary, botTokenMatches } from "./bot-summary";
import { linkGroups } from "./useful-links";

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
  const base = { today: "2026-10-18", bins: [], pendingApplications: 0, stays: [], trips: [], events: [], shares: null, emails: null };

  it("gives guests' first names only and marks which stays are confirmed", () => {
    const summary = botSummary({
      ...base,
      stays: [
        { id: 1, name: "Ana María López", partySize: 2, arrivalDate: "2026-10-20", departureDate: "2026-10-22", status: "approved", addedBy: null },
        { id: 2, name: " Joe ", partySize: 1, arrivalDate: "2026-10-25", departureDate: "2026-10-26", status: "pending", addedBy: null },
        { id: 3, name: "Declined Guest", partySize: 1, arrivalDate: "2026-10-25", departureDate: "2026-10-26", status: "declined", addedBy: null },
        { id: 4, name: "Sam Okafor", partySize: 1, arrivalDate: "2026-10-27", departureDate: "2026-10-28", status: "approved", addedBy: "Rita" },
      ],
    });
    expect(summary.stays).toEqual([
      { id: 1, firstName: "Ana", partySize: 2, arrivalDate: "2026-10-20", departureDate: "2026-10-22", confirmed: true, addedBy: null },
      { id: 2, firstName: "Joe", partySize: 1, arrivalDate: "2026-10-25", departureDate: "2026-10-26", confirmed: false, addedBy: null },
      { id: 4, firstName: "Sam", partySize: 1, arrivalDate: "2026-10-27", departureDate: "2026-10-28", confirmed: true, addedBy: "Rita" },
    ]);
  });

  it("passes on housemates' trips with their ids, and nothing else about them", () => {
    const trip = { id: 4, person: "Rita", leaveDate: "2026-11-02", backDate: "2026-11-06", place: "Lisbon" };
    const summary = botSummary({ ...base, trips: [{ ...trip, updatedBy: "Simon" } as typeof trip] });
    expect(summary.trips).toEqual([trip]);
  });

  it("passes on events with their ids and who added them, and nothing else about them", () => {
    const event = { id: 9, title: "Dinner", date: "2026-11-07", endDate: null, time: "8pm", place: null, link: null, addedBy: "Rita" };
    const summary = botSummary({ ...base, events: [{ ...event, updatedBy: "Grovelet" } as typeof event] });
    expect(summary.events).toEqual([event]);
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

  it("passes on recent house mail as text, with only attachment names", () => {
    const email = {
      fromName: "Thames Water",
      fromAddress: "bills@thameswater.co.uk",
      to: "house@example.com",
      subject: "Your bill",
      sentAt: new Date("2026-10-19T08:00:00Z"),
      body: "x".repeat(2500),
      attachments: [{ filename: "bill.pdf", mimeType: "application/pdf", size: 1234 }],
      labels: ["INBOX"],
    };
    const summary = botSummary({ ...base, emails: [email, { ...email, fromName: "house@example.com", fromAddress: "house@example.com", labels: ["SENT"] }] });
    expect(summary.emails).toEqual([
      {
        from: "Thames Water <bills@thameswater.co.uk>",
        to: "house@example.com",
        subject: "Your bill",
        date: "2026-10-19T08:00:00.000Z",
        sent: false,
        text: `${"x".repeat(2000)}…`,
        attachments: ["bill.pdf"],
      },
      expect.objectContaining({ from: "house@example.com", sent: true }),
    ]);
  });

  it("says null for mail when the house Gmail isn't connected", () => {
    expect(botSummary(base).emails).toBeNull();
  });

  it("gives every dashboard link that has an address, with its group and note", () => {
    const { links } = botSummary(base);
    expect(links).toHaveLength(linkGroups.flatMap((group) => group.links).filter((link) => link.href).length);
    expect(links).toContainEqual({
      group: "Accounts",
      name: "Hyperoptic",
      note: "Internet",
      url: "https://account.hyperoptic.com/",
    });
    expect(links.find((link) => link.name === "Michael Morris")?.note).toMatch(/maintenance/);
  });
});
