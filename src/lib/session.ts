import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Session token format: "<payload>.<hmac>". The payload is "<expiresAtMs>" after a password
// login, or "<expiresAtMs>:<linkId>" after a login link, so turning the link off can end the
// session. Password sessions have no identity, since the password is shared by the house.

export type Session = { expiresAt: number; linkId: number | null };

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  // Hash both sides so lengths match and comparison time doesn't leak anything.
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function createSessionToken(secret: string, expiresAt: number, linkId: number | null = null) {
  const payload = linkId === null ? String(expiresAt) : `${expiresAt}:${linkId}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function readSessionToken(token: string, secret: string, now = Date.now()): Session | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  if (!safeEqual(signature, sign(payload, secret))) return null;
  const [expiry, link] = payload.split(":");
  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return null;
  const linkId = link === undefined ? null : Number(link);
  if (linkId !== null && !Number.isInteger(linkId)) return null;
  return { expiresAt, linkId };
}

export function passwordMatches(attempt: string, expected: string) {
  return safeEqual(attempt, expected);
}

// The secret part of a login link. Only its hash is stored, so a copy of the database
// can't be used to log in.
export function newLinkKey() {
  return randomBytes(24).toString("base64url");
}

export function hashLinkKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}
