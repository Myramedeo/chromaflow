// GET /api/workspaces/[workspaceId]/billing
// Returns the workspace's current plan, subscription status, and usage counts.
// Used by the billing settings page to render the current state.

import { db } from "@/lib/db";
import { withRateLimit, ok, forbidden, getWorkspaceMembership } from "@/lib/api-helpers";
import { getWorkspaceSubscription } from "@/lib/subscription";
import { readLimiter } from "@/lib/rate-limit";

export const GET = withRateLimit(readLimiter, async (_req, { userId, params }) => {
  const { workspaceId } = params;

  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();

  const [sub, projectCount] = await Promise.all([
    getWorkspaceSubscription(workspaceId),
    db.project.count({
      where: { workspaceId, status: { not: "ARCHIVED" } },
    }),
  ]);

  return ok({
    plan:              sub.plan,
    status:            sub.status,
    currentPeriodEnd:  sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    projectCount,
  });
});