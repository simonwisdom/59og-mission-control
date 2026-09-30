import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows attempts under the limit", () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 1000 });
    limiter.recordFailure("ip", 0);
    expect(limiter.isBlocked("ip", 10)).toBe(false);
  });

  it("blocks once the limit is reached", () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 1000 });
    limiter.recordFailure("ip", 0);
    limiter.recordFailure("ip", 10);
    expect(limiter.isBlocked("ip", 20)).toBe(true);
  });

  it("unblocks after the window passes", () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 1000 });
    limiter.recordFailure("ip", 0);
    limiter.recordFailure("ip", 10);
    expect(limiter.isBlocked("ip", 1011)).toBe(false);
  });

  it("tracks keys separately", () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 1000 });
    limiter.recordFailure("a", 0);
    expect(limiter.isBlocked("b", 0)).toBe(false);
  });
});
