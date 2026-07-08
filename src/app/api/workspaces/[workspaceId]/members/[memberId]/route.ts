import { z } from "zod";
import { db } from "@/lib/db";
import {
  withRateLimit,
  ok,
  error,
  forbidden,
  notFound,
  getWorkspaceMembership,
} from "@/lib/api-helpers";
import {
  canRemoveMember,
  canManageWorkspace,
} from "@/lib/workspace-members";
import { logActivity, ACTIONS } from "@/lib/activity";
import { writeLimiter } from "@/lib/rate-limit";

const updateRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
});

async function getOwnerCount(workspaceId: string) {
  return db.workspaceMember.count({
    where: { workspaceId, role: "OWNER" },
  });
}

export const PATCH = withRateLimit(writeLimiter, async (req, { userId, params }) => {
  const { workspaceId, memberId } = params;
  const actorMembership = await getWorkspaceMembership(userId, workspaceId);
  if (!actorMembership) return forbidden();
  if (!canManageWorkspace(actorMembership.role)) return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return error("Invalid request body", 400, {
      details: z.flattenError(parsed.error),
    });
  }

  const targetMembership = await db.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });
  if (!targetMembership) return notFound("Member");

  const nextRole = parsed.data.role;
  if (actorMembership.role === "ADMIN") return forbidden();

  if (targetMembership.role === "OWNER" && nextRole !== "OWNER") {
    const ownerCount = await getOwnerCount(workspaceId);
    if (ownerCount <= 1) {
      return error("Cannot demote the last owner", 409);
    }
  }

  const updated = await db.workspaceMember.update({
    where: { id: targetMembership.id },
    data: { role: nextRole },
    include: {
      user: { select: { id: true, email: true, name: true, avatarUrl: true } },
    },
  });

  await logActivity({
    userId,
    action: ACTIONS.UPDATED_MEMBER_ROLE,
    metadata: {
      workspaceId,
      memberId: updated.id,
      targetUserId: updated.userId,
      fromRole: targetMembership.role,
      toRole: nextRole,
    },
  });

  return ok(updated);
});

export const DELETE = withRateLimit(writeLimiter, async (_req, { userId, params }) => {
  const { workspaceId, memberId } = params;
  const actorMembership = await getWorkspaceMembership(userId, workspaceId);
  if (!actorMembership) return forbidden();
  if (!canManageWorkspace(actorMembership.role)) return forbidden();

  const targetMembership = await db.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });
  if (!targetMembership) return notFound("Member");

  if (!canRemoveMember(actorMembership.role, targetMembership.role)) return forbidden();

  if (targetMembership.role === "OWNER") {
    const ownerCount = await getOwnerCount(workspaceId);
    if (ownerCount <= 1) {
      return error("Cannot remove the last owner", 409);
    }
  }

  await db.workspaceMember.delete({
    where: { id: targetMembership.id },
  });

  await logActivity({
    userId,
    action: ACTIONS.REMOVED_MEMBER,
    metadata: {
      workspaceId,
      memberId: targetMembership.id,
      targetUserId: targetMembership.userId,
      role: targetMembership.role,
    },
  });

  return ok({ removed: true });
});
