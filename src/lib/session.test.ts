import { describe, expect, it } from "vitest";
import { createSessionToken, passwordMatches, verifySessionToken } from "./session";

const secret = "test-secret-that-is-long-enough-1234567890";

describe("session tokens", () => {
  it("verifies a token it created", () => {
    const token = createSessionToken(secret, Date.now() + 60_000);
    expect(verifySessionToken(token, secret)).toBe(true);
  });

  it("rejects an expired token", () => {
    const token = createSessionToken(secret, Date.now() - 1);
    expect(verifySessionToken(token, secret)).toBe(false);
  });

  it("rejects a token with a tampered expiry", () => {
    const token = createSessionToken(secret, Date.now() + 60_000);
    const [, signature] = token.split(".");
    const forged = `${Date.now() + 10 * 365 * 86_400_000}.${signature}`;
    expect(verifySessionToken(forged, secret)).toBe(false);
  });

  it("rejects a token signed with a different secret", () => {
    const token = createSessionToken("another-secret-entirely-abcdefghijk", Date.now() + 60_000);
    expect(verifySessionToken(token, secret)).toBe(false);
  });

  it("rejects garbage", () => {
    expect(verifySessionToken("nonsense", secret)).toBe(false);
  });
});

describe("passwordMatches", () => {
  it("accepts the right password", () => {
    expect(passwordMatches("correct horse", "correct horse")).toBe(true);
  });

  it("rejects the wrong password", () => {
    expect(passwordMatches("wrong", "correct horse")).toBe(false);
  });
});
