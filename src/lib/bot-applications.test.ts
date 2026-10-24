import { describe, expect, it } from "vitest";
import type { Application, Note } from "@/db/schema";
import { approvalRefusal, botApplications, parseExpectedStay } from "./bot-applications";

const application = (id: number, createdAt: string, extra: Partial<Application> = {}): Application => ({
  id,
  createdAt: new Date(createdAt),
  status: "pending",
  name: " Ana López ",
  email: "ana@example.com",
  arrivalDate: "2026-11-01",
  departureDate: "2026-11-04",
  partySize: 2,
  about: "A potter from Lisbon",
  connection: "Rita's friend",
  offering: "A dinner",
  anythingElse: null,
  agreedToRules: true,
  addedBy: null,
  ...extra,
});

const note = (id: number, applicationId: number, createdAt: string, body: string): Note => ({
  id,
  applicationId,
  author: "Simon",
  body,
  createdAt: new Date(createdAt),
});

describe("botApplications", () => {
  it("gives every detail, newest first, with each application's own notes in order", () => {
    const result = botApplications(
      [application(1, "2026-10-01T10:00:00Z"), application(2, "2026-10-15T09:00:00Z", { status: "approved" })],
      [note(1, 1, "2026-10-03T00:00:00Z", "second"), note(2, 1, "2026-10-02T00:00:00Z", "first"), note(3, 2, "2026-10-16T00:00:00Z", "ok")],
    );
    expect(result.map((a) => a.id)).toEqual([2, 1]);
    expect(result[1]).toMatchObject({
      name: "Ana López",
      email: "ana@example.com",
      about: "A potter from Lisbon",
      connection: "Rita's friend",
      offering: "A dinner",
      sentAt: "2026-10-01T10:00:00.000Z",
    });
    expect(result[1].notes.map((n) => n.body)).toEqual(["first", "second"]);
    expect(result[0].notes.map((n) => n.body)).toEqual(["ok"]);
    expect(result[0]).not.toHaveProperty("agreedToRules");
  });

  it("leaves out stays housemates added for their own guests", () => {
    const result = botApplications(
      [application(1, "2026-10-01T10:00:00Z"), application(2, "2026-10-02T10:00:00Z", { addedBy: "Rita", email: null, about: null })],
      [],
    );
    expect(result.map((a) => a.id)).toEqual([1]);
  });
});

describe("approvalRefusal", () => {
  it("lets Grovelet approve a pending application, or a housemate's stay not confirmed yet", () => {
    expect(approvalRefusal(application(1, "2026-10-01T10:00:00Z"))).toBeNull();
    expect(approvalRefusal(application(2, "2026-10-01T10:00:00Z", { addedBy: "Rita", email: null, about: null }))).toBeNull();
  });

  it("answers 404 for no row and 409 for one that isn't pending", () => {
    expect(approvalRefusal(undefined)).toEqual({ status: 404, body: { error: "No such application" } });
    expect(approvalRefusal(application(1, "2026-10-01T10:00:00Z", { status: "declined" }))).toEqual({
      status: 409,
      body: { error: "This application is already declined" },
    });
    expect(approvalRefusal(application(2, "2026-10-01T10:00:00Z", { status: "approved", addedBy: "Rita" }))).toEqual({
      status: 409,
      body: { error: "This stay is already approved" },
    });
  });

  // The row's stay: 2026-11-01 to 2026-11-04, 2 people
  const stay = application(3, "2026-10-01T10:00:00Z", { addedBy: "Rita", email: null, about: null });
  const changed = { status: 409, body: { error: "This stay has changed", changed: true } };

  it("approves when what Grovelet expects still matches, all of it or only some", () => {
    expect(approvalRefusal(stay, { arrivalDate: "2026-11-01", departureDate: "2026-11-04", partySize: 2 })).toBeNull();
    expect(approvalRefusal(stay, { partySize: 2 })).toBeNull();
    expect(approvalRefusal(stay, {})).toBeNull();
  });

  it("answers 409 changed when the dates or party size differ from what Grovelet expects", () => {
    expect(approvalRefusal(stay, { arrivalDate: "2026-11-02" })).toEqual(changed);
    expect(approvalRefusal(stay, { departureDate: "2026-11-05" })).toEqual(changed);
    expect(approvalRefusal(stay, { arrivalDate: "2026-11-01", partySize: 3 })).toEqual(changed);
  });

  it("says already approved rather than changed for a stay no longer pending", () => {
    expect(approvalRefusal({ ...stay, status: "approved" }, { partySize: 3 })).toEqual({
      status: 409,
      body: { error: "This stay is already approved" },
    });
  });
});

describe("parseExpectedStay", () => {
  it("reads the optional dates and party size, leaving out what's missing or null", () => {
    expect(parseExpectedStay({ person: "Rita", arrivalDate: "2026-11-01", departureDate: "2026-11-04", partySize: 2 })).toEqual({
      success: true,
      data: { arrivalDate: "2026-11-01", departureDate: "2026-11-04", partySize: 2 },
    });
    expect(parseExpectedStay({ person: "Rita" })).toEqual({ success: true, data: {} });
    expect(parseExpectedStay({ partySize: null })).toEqual({ success: true, data: {} });
  });

  it("turns away a date that isn't one, or a party size that isn't a whole number", () => {
    expect(parseExpectedStay({ arrivalDate: "1 Nov" })).toEqual({ success: false, error: "Give arrivalDate as a date like 2026-11-07" });
    expect(parseExpectedStay({ departureDate: 20261104 })).toEqual({ success: false, error: "Give departureDate as a date like 2026-11-09" });
    expect(parseExpectedStay({ partySize: "2" })).toEqual({ success: false, error: "Give partySize as a whole number" });
    expect(parseExpectedStay({ partySize: 1.5 })).toEqual({ success: false, error: "Give partySize as a whole number" });
  });
});
