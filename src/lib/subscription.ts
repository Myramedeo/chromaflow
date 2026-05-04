// Server-side helpers for reading subscription state.
// Used by API routes and the billing page to check entitlements.

import { db } from "@/lib/db";
import { PLAN_LIMITS, type PlanTier } from "@/lib/plans";

// Returns the workspace's current subscription, or a synthetic FREE record if none exists.
export async function getWorkspaceSubscription(workspaceId: string) {
  const sub = await db.subscription.findUnique({
    where: { workspaceId },
  });

  // Workspaces without a subscription row are on the free plan
  return sub ?? {
    plan: "FREE" as PlanTier,
    status: "ACTIVE" as const,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  };
}

// Returns true if the workspace is on an active paid plan.
export async function isProWorkspace(workspaceId: string): Promise<boolean> {
  const sub = await getWorkspaceSubscription(workspaceId);
  return sub.plan === "PRO" && sub.status === "ACTIVE";
}

// Returns the plan limits for a given workspace.
export async function getWorkspaceLimits(workspaceId: string) {
  const sub = await getWorkspaceSubscription(workspaceId);
  return PLAN_LIMITS[sub.plan as PlanTier] ?? PLAN_LIMITS.FREE;
}