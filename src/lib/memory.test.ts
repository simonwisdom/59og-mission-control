import { describe, expect, it } from "vitest";
import type { Memory } from "@/db/schema";
import { botMemory, chainOf, DOCUMENT_LIMIT, looksSecret, memoryHistory, NOTE_LIMIT, parseMemory, sameTitle } from "./memory";

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
    expect(looksSecret("The front door's code is 4471")).toBe(true);
    expect(looksSecret("Wifi: OliveGrove22")).toBe(true);
    expect(looksSecret("The lockbox code is 1234")).toBe(true);
    expect(looksSecret("The PIN for the alarm is 9921")).toBe(true);
  });

  it("lets through a mention of a code without one", () => {
    expect(looksSecret("We give guests the door code on arrival.")).toBe(false);
    expect(looksSecret("Guests can stay 3 nights, 2 at weekends.")).toBe(false);
    expect(looksSecret("The wifi router is in the hall.")).toBe(false);
  });
});

describe("sameTitle", () => {
  it("matches names whatever their case and spacing", () => {
    expect(sameTitle(" Guest Policy", "guest policy")).toBe(true);
    expect(sameTitle("Guest policy", "House rules")).toBe(false);
  });
});

const row = (fields: Partial<Memory>): Memory => ({
  id: 1,
  kind: "note",
  title: null,
  body: "",
  addedBy: "Rita",
  createdAt: new Date("2026-10-20T09:00:00Z"),
  chainId: null,
  replacedAt: null,
  replacedBy: null,
  removedAt: null,
  removedBy: null,
  ...fields,
});

describe("memoryHistory", () => {
  it("lists forgotten and replaced rows, latest change first, saying what happened", () => {
    const history = memoryHistory([
      row({ id: 1, body: "Live" }),
      row({ id: 2, body: "Old", replacedAt: new Date("2026-10-21T00:00:00Z"), replacedBy: "Alex" }),
      row({ id: 3, body: "Gone", removedAt: new Date("2026-10-22T00:00:00Z"), removedBy: "Rita" }),
      row({ id: 4, body: "Gone too", removedAt: new Date("2026-10-20T12:00:00Z") }),
    ]);
    expect(history.map((entry) => [entry.row.id, entry.what])).toEqual([
      [3, "Forgotten by Rita"],
      [2, "Replaced by a newer version from Alex"],
      [4, "Forgotten"],
    ]);
  });

  it("keeps every version of a chain together by its first id", () => {
    expect(chainOf(row({ id: 7, chainId: null }))).toBe(7);
    expect(chainOf(row({ id: 9, chainId: 7 }))).toBe(7);
  });
});

describe("botMemory", () => {
  it("splits live notes and documents, oldest first, and leaves out replaced and forgotten ones", () => {
    expect(
      botMemory([
        row({ id: 3, kind: "document", title: "Guest policy", body: "New", createdAt: new Date("2026-10-19T00:00:00Z") }),
        row({ id: 2, kind: "document", title: "Guest policy", body: "Old", replacedAt: new Date() }),
        row({ id: 6, body: "Forgotten", removedAt: new Date() }),
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
