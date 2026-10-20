import { describe, expect, it } from "vitest";
import type { Memory } from "@/db/schema";
import { botMemory, DOCUMENT_LIMIT, looksSecret, NOTE_LIMIT, parseMemory, sameTitle } from "./memory";

describe("parseMemory", () => {
  it("accepts a note and drops any title it came with", () => {
    expect(parseMemory({ kind: "note", title: "x", body: " The boiler resets with the red button ", addedBy: "Rita" })).toEqual({
      success: true,
      data: { kind: "note", title: null, body: "The boiler resets with the red button", addedBy: "Rita" },
    });
  });

  it("needs a name for a document", () => {
    expect(parseMemory({ kind: "document", body: "Guests stay up to 3 nights." })).toEqual({
      success: false,
      errors: { title: "Give the document a name" },
    });
  });

  it("turns away a note over the note limit but takes a document that long", () => {
    const long = "a".repeat(NOTE_LIMIT + 1);
    expect(parseMemory({ kind: "note", body: long }).success).toBe(false);
    expect(parseMemory({ kind: "document", title: "Guest policy", body: long }).success).toBe(true);
    expect(parseMemory({ kind: "document", title: "Guest policy", body: "a".repeat(DOCUMENT_LIMIT + 1) }).success).toBe(false);
  });

  it("turns away codes and passwords", () => {
    expect(parseMemory({ kind: "note", body: "The door code is 4471" })).toEqual({
      success: false,
      errors: { body: "That looks like a code or password. Grovelet doesn't keep those, so keep it somewhere private" },
    });
  });

  it("turns away anything that isn't a note or document", () => {
    expect(parseMemory({ kind: "rule", body: "x" }).success).toBe(false);
  });
});

describe("looksSecret", () => {
  it("spots a code or password with its value", () => {
    expect(looksSecret("wifi password: olives22")).toBe(true);
    expect(looksSecret("PIN 1234")).toBe(true);
    expect(looksSecret("key safe code = 0912")).toBe(true);
  });

  it("lets through a mention of a code without one", () => {
    expect(looksSecret("We give guests the door code on arrival.")).toBe(false);
    expect(looksSecret("Guests can stay 3 nights, 2 at weekends.")).toBe(false);
  });
});

describe("sameTitle", () => {
  it("matches names whatever their case and spacing", () => {
    expect(sameTitle(" Guest Policy", "guest policy")).toBe(true);
    expect(sameTitle("Guest policy", "House rules")).toBe(false);
  });
});

describe("botMemory", () => {
  const row = (fields: Partial<Memory>): Memory => ({
    id: 1,
    kind: "note",
    title: null,
    body: "",
    addedBy: "Rita",
    createdAt: new Date("2026-10-20T09:00:00Z"),
    replacedAt: null,
    ...fields,
  });

  it("splits live notes and documents, oldest first, and leaves out replaced documents", () => {
    expect(
      botMemory([
        row({ id: 3, kind: "document", title: "Guest policy", body: "New", createdAt: new Date("2026-10-19T00:00:00Z") }),
        row({ id: 2, kind: "document", title: "Guest policy", body: "Old", replacedAt: new Date() }),
        row({ id: 5, body: "Second", createdAt: new Date("2026-10-21T00:00:00Z") }),
        row({ id: 4, body: "First" }),
      ]),
    ).toEqual({
      notes: [
        { id: 4, text: "First", addedBy: "Rita", date: "2026-10-20" },
        { id: 5, text: "Second", addedBy: "Rita", date: "2026-10-21" },
      ],
      documents: [{ id: 3, title: "Guest policy", text: "New", addedBy: "Rita", date: "2026-10-19" }],
    });
  });
});
