import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

// General API reads - generous limit
export const readLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),  // 60 req/min
  prefix: "rl:read",
});

// Write operations (create task, move task, create project)
export const writeLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),  // 30 req/min
  prefix: "rl:write",
});

// Billing endpoints - very tight, no abuse
export const billingLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),   // 5 req/min
  prefix: "rl:billing",
});