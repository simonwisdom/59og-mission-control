import { describe, expect, it } from "vitest";
import { isStatus } from "./review";

describe("isStatus", () => {
  it("accepts a known status", () => {
    expect(isStatus("approved")).toBe(true);
  });

  it("rejects an unknown status", () => {
    expect(isStatus("maybe")).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isStatus(null)).toBe(false);
  });
});
