// Single source of truth for plan limits and feature flags.
// Import from here everywhere, never hardcode limits in routes or components.

export const PLAN_LIMITS = {
  FREE: {
    projects:   3,
    members:    5,
    label:      "Free",
    priceLabel: "$0 / month",
  },
  PRO: {
    projects:   Infinity,
    members:    Infinity,
    label:      "Pro",
    priceLabel: "$12 / month",
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;

// Machine-readable error code returned by the API when a plan limit is hit.
// The frontend checks for this code to show an upgrade prompt.
export const PLAN_LIMIT_ERROR = "plan_limit_exceeded";