import { describe, expect, it } from "vitest";
import { safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("keeps dashboard paths", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/dashboard/applications/3")).toBe("/dashboard/applications/3");
    expect(safeNextPath("/dashboard/applications?status=pending")).toBe("/dashboard/applications?status=pending");
  });

  it("falls back to the dashboard for anything else", () => {
    for (const value of [null, undefined, "", "/", "/login", "/dashboardx", "//evil.com", "/\\evil.com", "https://evil.com/dashboard"]) {
      expect(safeNextPath(value)).toBe("/dashboard");
    }
  });
});
