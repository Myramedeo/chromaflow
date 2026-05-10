import { db } from "@/lib/db";
import {
  withAuth,
  ok,
  forbidden,
  getWorkspaceMembership,
} from "@/lib/api-helpers";

export const GET = withAuth(async (_req, { userId, params }) => {
  const { workspaceId } = params;
  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();

  const members = await db.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: { select: { id: true, email: true, name: true, avatarUrl: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  return ok({ members, currentUserRole: membership.role, currentUserId: userId });
});
