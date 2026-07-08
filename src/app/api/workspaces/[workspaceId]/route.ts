// GET    /api/workspaces/[workspaceId]  — get workspace + members
// PATCH  /api/workspaces/[workspaceId]  — update name/slug (OWNER/ADMIN only)
// DELETE /api/workspaces/[workspaceId]  — hard-delete workspace (OWNER only)

import { db } from "@/lib/db";
import {
  withRateLimit,
  ok,
  error,
  forbidden,
  notFound,
  getWorkspaceMembership,
  parseBody,
} from "@/lib/api-helpers";
import { logActivity, ACTIONS } from "@/lib/activity";
import { stripe } from "@/lib/stripe";
import { writeLimiter, readLimiter } from "@/lib/rate-limit";

export const GET = withRateLimit(readLimiter, async (_req, { userId, params }) => {
  const { workspaceId } = params;

  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: { user: true },
        orderBy: { joinedAt: "asc" },
      },
      _count: { select: { projects: true } },
    },
  });

  if (!workspace) return notFound("Workspace");

  return ok({ ...workspace, currentUserRole: membership.role });
});

interface UpdateWorkspaceBody {
  name?: string;
  slug?: string;
}

export const PATCH = withRateLimit(writeLimiter, async (req, { userId, params }) => {
  const { workspaceId } = params;

  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();

  if (!["OWNER", "ADMIN"].includes(membership.role)) {
    return forbidden();
  }

  const body = await parseBody<UpdateWorkspaceBody>(req);
  if (!body) return error("Invalid request body");

  if (body.slug && !/^[a-z0-9-]+$/.test(body.slug)) {
    return error("slug may only contain lowercase letters, numbers, and hyphens");
  }

  const workspace = await db.workspace.update({
    where: { id: workspaceId },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.slug && { slug: body.slug }),
    },
  });

  return ok(workspace);
});

interface DeleteWorkspaceBody {
  confirmName: string;
}

export const DELETE = withRateLimit(writeLimiter, async (req, { userId, params }) => {
  const { workspaceId } = params;

  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();

  if (membership.role !== "OWNER") {
    return forbidden();
  }

  const body = await parseBody<DeleteWorkspaceBody>(req);
  if (!body?.confirmName) {
    return error("confirmName is required");
  }

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: { subscription: true },
  });

  if (!workspace) return notFound("Workspace");

  if (body.confirmName !== workspace.name) {
    return error("Confirmation name does not match workspace name");
  }

  const stripeSubscriptionId = workspace.subscription?.stripeSubscriptionId;
  if (stripeSubscriptionId) {
    try {
      await stripe.subscriptions.cancel(stripeSubscriptionId);
    } catch (err) {
      // Allow delete even if subscription is already cancelled in Stripe
      console.error("[workspace] Failed to cancel Stripe subscription:", err);
    }
  }

  await logActivity({
    userId,
    action: ACTIONS.DELETED_WORKSPACE,
    metadata: { workspaceId: workspace.id, name: workspace.name },
  });

  await db.workspace.delete({ where: { id: workspaceId } });

  return ok({ deleted: true });
});