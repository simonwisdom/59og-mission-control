import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Session token format: "<expiresAtMs>.<hmac>". No user identity, since the
// dashboard uses a single shared house password.

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  // Hash both sides so lengths match and comparison time doesn't leak anything.
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function createSessionToken(secret: string, expiresAt: number) {
  const payload = String(expiresAt);
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token: string, secret: string, now = Date.now()) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!safeEqual(signature, sign(payload, secret))) return false;
  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > now;
}

export function passwordMatches(attempt: string, expected: string) {
  return safeEqual(attempt, expected);
}
