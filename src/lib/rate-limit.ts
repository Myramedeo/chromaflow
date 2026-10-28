type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export function createRateLimiter(
  limit: number,
  windowMs: number
) {
  const requests = new Map<string, RateLimitEntry>();

  return function checkRateLimit(
    key: string
  ): RateLimitResult {
    const now = Date.now();
    const entry = requests.get(key);

    if (!entry || now >= entry.resetAt) {
      const resetAt = now + windowMs;

      requests.set(key, {
        count: 1,
        resetAt,
      });

      return {
        success: true,
        limit,
        remaining: limit - 1,
        resetAt,
      };
    }

    if (entry.count >= limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    entry.count++;

    return {
      success: true,
      limit,
      remaining: limit - entry.count,
      resetAt: entry.resetAt,
    };
  };
}

// General API reads: 60 requests/minute
export const readLimiter = createRateLimiter(
  60,
  60_000
);

// Write operations: 30 requests/minute
export const writeLimiter = createRateLimiter(
  30,
  60_000
);

// Billing endpoints: 5 requests/minute
export const billingLimiter = createRateLimiter(
  5,
  60_000
);
