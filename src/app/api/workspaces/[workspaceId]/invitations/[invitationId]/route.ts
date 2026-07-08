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
  canAssignRole,
  canManageWorkspace,
  normalizeEmail,
} from "@/lib/workspace-members";
import {
  createInvitationToken,
  getInvitationExpiryDate,
  hashInvitationToken,
} from "@/lib/invitations";
import { logActivity, ACTIONS } from "@/lib/activity";
import { writeLimiter } from "@/lib/rate-limit";

export const DELETE = withRateLimit(writeLimiter, async (_req, { userId, params }) => {
  const { workspaceId, invitationId } = params;
  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();
  if (!canManageWorkspace(membership.role)) return forbidden();

  const invitation = await db.workspaceInvitation.findFirst({
    where: { id: invitationId, workspaceId },
  });
  if (!invitation) return notFound("Invitation");

  if (invitation.status !== "PENDING") {
    return error("Invitation is no longer active", 409);
  }
  if (!canAssignRole(membership.role, invitation.role)) return forbidden();

  const now = new Date();
  const status = invitation.expiresAt <= now ? "EXPIRED" : "REVOKED";

  await db.workspaceInvitation.update({
    where: { id: invitation.id },
    data: { status },
  });

  await logActivity({
    userId,
    action: ACTIONS.REVOKED_INVITATION,
    metadata: {
      workspaceId,
      invitationId: invitation.id,
      email: normalizeEmail(invitation.email),
      status,
    },
  });

  return ok({ revoked: status === "REVOKED", status });
});

export const POST = withRateLimit(writeLimiter, async (req, { userId, params }) => {
  const { workspaceId, invitationId } = params;
  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();
  if (!canManageWorkspace(membership.role)) return forbidden();

  const invitation = await db.workspaceInvitation.findFirst({
    where: { id: invitationId, workspaceId },
  });
  if (!invitation) return notFound("Invitation");
  if (!canAssignRole(membership.role, invitation.role)) return forbidden();

  if (invitation.status !== "PENDING") {
    return error("Invitation is no longer active", 409);
  }

  const now = new Date();
  if (invitation.expiresAt <= now) {
    await db.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    return error("Invitation has expired", 410);
  }

  const token = createInvitationToken();
  await db.workspaceInvitation.update({
    where: { id: invitation.id },
    data: {
      tokenHash: hashInvitationToken(token),
      expiresAt: getInvitationExpiryDate(),
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const inviteUrl = `${appUrl}/invitations/accept?workspaceId=${workspaceId}&token=${token}`;

  return ok({ inviteUrl });
});
