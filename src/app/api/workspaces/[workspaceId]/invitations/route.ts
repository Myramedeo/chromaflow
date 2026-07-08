import { z } from "zod";
import { db } from "@/lib/db";
import {
  withRateLimit,
  ok,
  created,
  error,
  forbidden,
  getWorkspaceMembership,
} from "@/lib/api-helpers";
import { getWorkspaceLimits } from "@/lib/subscription";
import { PLAN_LIMIT_ERROR } from "@/lib/plans";
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
import { writeLimiter, readLimiter } from "@/lib/rate-limit";

const invitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export const GET = withRateLimit(readLimiter, async (_req, { userId, params }) => {
  const { workspaceId } = params;
  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();
  if (!canManageWorkspace(membership.role)) return forbidden();

  const now = new Date();
  await db.workspaceInvitation.updateMany({
    where: { workspaceId, status: "PENDING", expiresAt: { lte: now } },
    data: { status: "EXPIRED" },
  });

  const invitations = await db.workspaceInvitation.findMany({
    where: { workspaceId, status: "PENDING", expiresAt: { gt: now } },
    include: {
      invitedBy: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(invitations);
});

export const POST = withRateLimit(writeLimiter, async (req, { userId, params }) => {
  const { workspaceId } = params;
  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();
  if (!canManageWorkspace(membership.role)) return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = invitationSchema.safeParse(body);
  if (!parsed.success) {
    return error("Invalid request body", 400, {
      details: z.flattenError(parsed.error),
    });
  }

  const email = normalizeEmail(parsed.data.email);
  const role = parsed.data.role;
  if (!canAssignRole(membership.role, role)) return forbidden();

  const inviter = await db.user.findUnique({ where: { id: userId } });
  if (inviter?.email.toLowerCase() === email) {
    return error("You are already a member of this workspace");
  }

  const existingMember = await db.workspaceMember.findFirst({
    where: {
      workspaceId,
      user: { email: { equals: email, mode: "insensitive" } },
    },
  });
  if (existingMember) {
    return error("User is already a member of this workspace", 409);
  }

  const now = new Date();
  await db.workspaceInvitation.updateMany({
    where: { workspaceId, status: "PENDING", expiresAt: { lte: now } },
    data: { status: "EXPIRED" },
  });

  const limits = await getWorkspaceLimits(workspaceId);
  if (limits.members !== Infinity) {
    const [memberCount, pendingInviteCount] = await Promise.all([
      db.workspaceMember.count({ where: { workspaceId } }),
      db.workspaceInvitation.count({
        where: { workspaceId, status: "PENDING", expiresAt: { gt: now } },
      }),
    ]);

    if (memberCount + pendingInviteCount >= limits.members) {
      return error(
        `Free plan is limited to ${limits.members} team members. Upgrade to Pro for unlimited members.`,
        403,
        { code: PLAN_LIMIT_ERROR }
      );
    }
  }

  const existingInvite = await db.workspaceInvitation.findFirst({
    where: { workspaceId, email, status: "PENDING", expiresAt: { gt: now } },
  });
  if (existingInvite) {
    return error("An active invitation already exists for this email", 409);
  }

  const token = createInvitationToken();
  const invitation = await db.workspaceInvitation.create({
    data: {
      workspaceId,
      email,
      role,
      invitedById: userId,
      tokenHash: hashInvitationToken(token),
      expiresAt: getInvitationExpiryDate(),
    },
    include: {
      invitedBy: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  });

  await logActivity({
    userId,
    action: ACTIONS.INVITED_MEMBER,
    metadata: {
      workspaceId,
      invitationId: invitation.id,
      email: invitation.email,
      role: invitation.role,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const inviteUrl = `${appUrl}/invitations/accept?workspaceId=${workspaceId}&token=${token}`;

  return created({ invitation, inviteUrl });
});
