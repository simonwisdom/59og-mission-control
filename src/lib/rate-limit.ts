// In-memory limiter for failed logins. Fine for a single Railway instance;
// counts reset on redeploy, which is acceptable for a house dashboard.
export function createRateLimiter({ max, windowMs }: { max: number; windowMs: number }) {
  const failures = new Map<string, number[]>();

  function recent(key: string, now: number) {
    const kept = (failures.get(key) ?? []).filter((t) => now - t < windowMs);
    if (kept.length) failures.set(key, kept);
    else failures.delete(key);
    return kept;
  }

  return {
    isBlocked(key: string, now = Date.now()) {
      return recent(key, now).length >= max;
    },
    recordFailure(key: string, now = Date.now()) {
      failures.set(key, [...recent(key, now), now]);
    },
  };
}
