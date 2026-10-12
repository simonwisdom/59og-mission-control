import { describe, expect, it } from "vitest";
import { createSessionToken, hashLinkKey, newLinkKey, passwordMatches, readSessionToken } from "./session";

const secret = "test-secret-that-is-long-enough-1234567890";

describe("session tokens", () => {
  it("reads a password session it created", () => {
    const expiresAt = Date.now() + 60_000;
    const token = createSessionToken(secret, expiresAt);
    expect(readSessionToken(token, secret)).toEqual({ expiresAt, linkId: null });
  });

  it("reads a login link session with its link id", () => {
    const expiresAt = Date.now() + 60_000;
    const token = createSessionToken(secret, expiresAt, 7);
    expect(readSessionToken(token, secret)).toEqual({ expiresAt, linkId: 7 });
  });

  it("rejects an expired token", () => {
    const token = createSessionToken(secret, Date.now() - 1);
    expect(readSessionToken(token, secret)).toBeNull();
  });

  it("rejects a token with a tampered expiry", () => {
    const token = createSessionToken(secret, Date.now() + 60_000);
    const [, signature] = token.split(".");
    const forged = `${Date.now() + 10 * 365 * 86_400_000}.${signature}`;
    expect(readSessionToken(forged, secret)).toBeNull();
  });

  it("rejects a token with a changed or removed link id", () => {
    const expiresAt = Date.now() + 60_000;
    const [, signature] = createSessionToken(secret, expiresAt, 7).split(".");
    expect(readSessionToken(`${expiresAt}:8.${signature}`, secret)).toBeNull();
    expect(readSessionToken(`${expiresAt}.${signature}`, secret)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = createSessionToken("another-secret-entirely-abcdefghijk", Date.now() + 60_000);
    expect(readSessionToken(token, secret)).toBeNull();
  });

  it("rejects garbage", () => {
    expect(readSessionToken("nonsense", secret)).toBeNull();
  });
});

describe("login link keys", () => {
  it("makes a different key each time, safe to put in a URL", () => {
    const key = newLinkKey();
    expect(key).toMatch(/^[\w-]{32}$/);
    expect(newLinkKey()).not.toBe(key);
  });

  it("hashes the same key the same way", () => {
    expect(hashLinkKey("abc")).toBe(hashLinkKey("abc"));
    expect(hashLinkKey("abc")).not.toBe(hashLinkKey("abd"));
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
