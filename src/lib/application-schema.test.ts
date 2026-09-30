import { describe, expect, it } from "vitest";
import { parseApplication } from "./application-schema";

function formData(overrides: Record<string, string | null> = {}) {
  const base: Record<string, string> = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    arrivalDate: "2026-10-10",
    departureDate: "2026-10-14",
    partySize: "1",
    about: "Mathematician, visiting friends in town.",
    connection: "",
    anythingElse: "",
    agreedToRules: "on",
  };
  const fd = new FormData();
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    if (value !== null) fd.set(key, value);
  }
  return fd;
}

describe("parseApplication", () => {
  it("accepts a complete application", () => {
    const result = parseApplication(formData());
    expect(result.success).toBe(true);
  });

  it("stores blank optional fields as null", () => {
    const result = parseApplication(formData());
    expect(result.success && result.data.anythingElse).toBeNull();
  });

  it("converts party size to a number", () => {
    const result = parseApplication(formData({ partySize: "3" }));
    expect(result.success && result.data.partySize).toBe(3);
  });

  it("accepts optional fields being left out entirely", () => {
    const result = parseApplication(formData({ connection: null, anythingElse: null }));
    expect(result.success).toBe(true);
  });

  it("gives a readable error when a required field is missing", () => {
    const result = parseApplication(formData({ about: null }));
    expect(!result.success && result.errors.about).toBe("Tell us a bit about yourself and your visit");
  });

  it("flags bad dates even when other fields are invalid too", () => {
    const result = parseApplication(formData({ agreedToRules: null, departureDate: "2026-10-01" }));
    expect(!result.success && result.errors.departureDate).toBeDefined();
  });

  it("ignores fields that are no longer on the form", () => {
    const fd = formData();
    fd.set("phone", "07700 900000");
    const result = parseApplication(fd);
    expect(result.success && "phone" in result.data).toBe(false);
  });

  it("requires a name", () => {
    const result = parseApplication(formData({ name: "  " }));
    expect(!result.success && result.errors.name).toBeDefined();
  });

  it("rejects an invalid email", () => {
    const result = parseApplication(formData({ email: "not-an-email" }));
    expect(!result.success && result.errors.email).toBeDefined();
  });

  it("rejects a departure before arrival", () => {
    const result = parseApplication(formData({ departureDate: "2026-10-09" }));
    expect(!result.success && result.errors.departureDate).toBeDefined();
  });

  it("rejects a party size of zero", () => {
    const result = parseApplication(formData({ partySize: "0" }));
    expect(!result.success && result.errors.partySize).toBeDefined();
  });

  it("requires agreeing to the house rules", () => {
    const result = parseApplication(formData({ agreedToRules: null }));
    expect(!result.success && result.errors.agreedToRules).toBeDefined();
  });
});
