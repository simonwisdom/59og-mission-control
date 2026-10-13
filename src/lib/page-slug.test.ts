import { describe, expect, it } from "vitest";
import { SLUG_MAX, isValidSlug, slugify } from "./page-slug";

describe("slugify", () => {
  it("turns a title into a link name", () => {
    expect(slugify("A Room in Our House!")).toBe("a-room-in-our-house");
    expect(slugify("  Café   rules -- 2026 ")).toBe("cafe-rules-2026");
  });

  it("gives an empty slug when nothing usable is left", () => {
    expect(slugify("!!!")).toBe("");
  });

  it("keeps within the length limit without a trailing dash", () => {
    const slug = slugify(`${"a".repeat(SLUG_MAX - 1)} b`);
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX);
    expect(isValidSlug(slug)).toBe(true);
  });
});

describe("isValidSlug", () => {
  it("accepts lowercase words joined by single dashes", () => {
    expect(isValidSlug("room")).toBe(true);
    expect(isValidSlug("house-rules-2")).toBe(true);
  });

  it("rejects anything else", () => {
    for (const slug of ["", "Room", "-room", "room-", "a--b", "a b", "a/b", "../x", "a".repeat(SLUG_MAX + 1)]) {
      expect(isValidSlug(slug)).toBe(false);
    }
  });
});
