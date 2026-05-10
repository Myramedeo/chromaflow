import { z } from "zod";
import { db } from "@/lib/db";
import {
  withAuth,
  ok,
  error,
  notFound,
  forbidden,
} from "@/lib/api-helpers";
import { hashInvitationToken } from "@/lib/invitations";
import { syncUser } from "@/lib/sync-user";
import { logActivity, ACTIONS } from "@/lib/activity";

const acceptSchema = z.object({
  token: z.string().min(1),
});

export const POST = withAuth(async (req, { userId, params }) => {
  const { workspaceId } = params;
  await syncUser(userId);

  const body = await req.json().catch(() => null);
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    return error("Invalid request body", 400, {
      details: z.flattenError(parsed.error),
    });
  }

  const tokenHash = hashInvitationToken(parsed.data.token);
  const now = new Date();

  const invitation = await db.workspaceInvitation.findFirst({
    where: { workspaceId, tokenHash },
  });
  if (!invitation) return notFound("Invitation");
  if (invitation.status !== "PENDING") {
    return error("Invitation is no longer active", 409);
  }
  if (invitation.expiresAt <= now) {
    await db.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    return error("Invitation has expired", 410);
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return error("User not found", 404);
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return forbidden();
  }

  await db.$transaction(async (tx) => {
    const existingMember = await tx.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!existingMember) {
      await tx.workspaceMember.create({
        data: {
          userId,
          workspaceId,
          role: invitation.role,
        },
      });
    }

    await tx.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" },
    });
  });

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, slug: true },
  });
  if (!workspace) return notFound("Workspace");

  await logActivity({
    userId,
    action: ACTIONS.ACCEPTED_INVITATION,
    metadata: {
      workspaceId,
      invitationId: invitation.id,
      role: invitation.role,
    },
  });

  return ok({ accepted: true, workspace });
});
