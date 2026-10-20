import { describe, expect, it } from "vitest";
import type { Application, Note } from "@/db/schema";
import { botApplications } from "./bot-applications";

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
});
