import { describe, expect, it } from "vitest";
import {
  calendarFeedToken,
  feedTokenMatches,
  guestFeed,
  isMonth,
  monthWeeks,
  nextDay,
  shiftMonth,
  weeksFrom,
  bookedNights,
  overlapsBooked,
  stayNights,
  type Stay,
} from "./guest-calendar";

const secret = "test-secret-that-is-long-enough-1234567890";

const stay = (overrides: Partial<Stay> = {}): Stay => ({
  id: 7,
  name: "Ada Lovelace",
  partySize: 1,
  arrivalDate: "2026-10-30",
  departureDate: "2026-11-02",
  status: "approved",
  addedBy: null,
  ...overrides,
});

describe("feed token", () => {
  it("matches the token for the same secret", () => {
    expect(feedTokenMatches(calendarFeedToken(secret), secret)).toBe(true);
  });

  it("rejects a token from another secret, or garbage", () => {
    expect(feedTokenMatches(calendarFeedToken("another-secret-entirely-abcdefghijk"), secret)).toBe(false);
    expect(feedTokenMatches("guests", secret)).toBe(false);
  });
});

describe("dates", () => {
  it("steps over month and year ends", () => {
    expect(nextDay("2026-10-31")).toBe("2026-11-01");
    expect(nextDay("2026-12-31")).toBe("2027-01-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("lays a month out in Monday-first weeks", () => {
    // October 2026 starts on a Thursday and ends on a Saturday
    const weeks = monthWeeks("2026-10");
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toBe("2026-09-28");
    expect(weeks[0][3]).toBe("2026-10-01");
    expect(weeks.at(-1)?.at(-1)).toBe("2026-11-01");
  });

  it("runs weeks on from the week holding a day", () => {
    // 2026-11-01 is a Sunday, so its week starts the Monday before
    const weeks = weeksFrom("2026-11-01", 5);
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toBe("2026-10-26");
    expect(weeks[0][6]).toBe("2026-11-01");
    expect(weeks.at(-1)?.at(-1)).toBe("2026-11-29");
    expect(weeksFrom("2026-10-12", 1)[0][0]).toBe("2026-10-12");
  });

  it("accepts only YYYY-MM months", () => {
    expect(isMonth("2026-10")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("oct")).toBe(false);
  });
});

describe("guest feed", () => {
  const now = new Date("2026-10-12T09:30:00.123Z");

  it("makes an all-day event that includes the departure day", () => {
    const feed = guestFeed([stay()], { now });
    expect(feed).toContain("DTSTART;VALUE=DATE:20261030\r\n");
    expect(feed).toContain("DTEND;VALUE=DATE:20261103\r\n");
    expect(feed).toContain("DTSTAMP:20261012T093000Z\r\n");
    expect(feed).toContain("SUMMARY:Ada Lovelace\r\n");
    expect(feed).toContain("STATUS:CONFIRMED\r\n");
    expect(feed.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("marks requested stays and escapes commas in names", () => {
    const feed = guestFeed([stay({ status: "pending", name: "Smith, Jo", partySize: 3 })], { now });
    expect(feed).toContain("SUMMARY:Requested: Smith\\, Jo (3 people)\r\n");
    expect(feed).toContain("STATUS:TENTATIVE\r\n");
  });

  it("links to the application when the app URL is known", () => {
    expect(guestFeed([stay()], { now, appUrl: "https://example.com/" })).toContain(
      "URL:https://example.com/dashboard/applications/7\r\n",
    );
    expect(guestFeed([stay()], { now })).not.toContain("URL:");
  });

  it("links a stay a housemate added to its own page", () => {
    expect(guestFeed([stay({ addedBy: "Rita" })], { now, appUrl: "https://example.com" })).toContain(
      "URL:https://example.com/dashboard/calendar/stays/7\r\n",
    );
  });

  it("adds housemates' trips through the day they're back", () => {
    const trip = { id: 4, person: "Rita", leaveDate: "2026-11-02", backDate: "2026-11-06", place: "Lisbon, Portugal" };
    const feed = guestFeed([], { now, trips: [trip], appUrl: "https://example.com" });
    expect(feed).toContain("UID:housemate-trip-4@olive-grove\r\n");
    expect(feed).toContain("DTSTART;VALUE=DATE:20261102\r\n");
    expect(feed).toContain("DTEND;VALUE=DATE:20261107\r\n");
    expect(feed).toContain("SUMMARY:Rita away · Lisbon\\, Portugal\r\n");
    expect(feed).toContain("URL:https://example.com/dashboard/calendar/trips/4\r\n");
  });

  it("folds long lines at 75 bytes", () => {
    const feed = guestFeed([stay({ name: "A".repeat(200) })], { now });
    for (const line of feed.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    expect(feed.replace(/\r\n /g, "")).toContain(`SUMMARY:${"A".repeat(200)}`);
  });
});

describe("booked nights", () => {
  it("covers arrival up to the night before departure", () => {
    expect(stayNights(stay())).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
  });

  it("counts a same-day visit as its one day", () => {
    expect(stayNights(stay({ arrivalDate: "2026-10-30", departureDate: "2026-10-30" }))).toEqual(["2026-10-30"]);
  });

  it("merges stays into one sorted list without repeats", () => {
    const booked = bookedNights([
      stay({ arrivalDate: "2026-11-01", departureDate: "2026-11-03" }),
      stay({ arrivalDate: "2026-10-31", departureDate: "2026-11-02" }),
    ]);
    expect(booked).toEqual(["2026-10-31", "2026-11-01", "2026-11-02"]);
  });

  it("lets a guest arrive the day another leaves, but not stay over a booked night", () => {
    const booked = bookedNights([stay()]);
    expect(overlapsBooked({ arrivalDate: "2026-11-02", departureDate: "2026-11-05" }, booked)).toBe(false);
    expect(overlapsBooked({ arrivalDate: "2026-10-27", departureDate: "2026-10-30" }, booked)).toBe(false);
    expect(overlapsBooked({ arrivalDate: "2026-10-27", departureDate: "2026-10-31" }, booked)).toBe(true);
    expect(overlapsBooked({ arrivalDate: "2026-10-25", departureDate: "2026-11-05" }, booked)).toBe(true);
  });
});
