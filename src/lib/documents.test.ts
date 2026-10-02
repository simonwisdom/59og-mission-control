import { describe, expect, it } from "vitest";
import { expiryStatus, isWebUrl } from "./documents";

describe("expiryStatus", () => {
  const today = "2026-10-02";

  it("handles documents with no expiry", () => {
    expect(expiryStatus(null, today)).toBe("none");
  });

  it("flags expired, due soon and fine", () => {
    expect(expiryStatus("2026-10-01", today)).toBe("expired");
    expect(expiryStatus("2026-10-02", today)).toBe("soon");
    expect(expiryStatus("2026-12-01", today)).toBe("soon");
    expect(expiryStatus("2027-06-01", today)).toBe("ok");
  });
});

describe("isWebUrl", () => {
  it("accepts Drive links", () => {
    expect(isWebUrl("https://drive.google.com/file/d/abc/view")).toBe(true);
  });

  it("rejects script and junk", () => {
    expect(isWebUrl("javascript:alert(1)")).toBe(false);
    expect(isWebUrl("not a url")).toBe(false);
  });
});
