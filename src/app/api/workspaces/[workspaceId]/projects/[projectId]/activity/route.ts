// GET /api/workspaces/[workspaceId]/projects/[projectId]/activity?limit=20
// Returns the N most recent ActivityLog rows for a project, joined with user info.

import { db } from "@/lib/db";
import {
  withAuth,
  ok,
  forbidden,
  notFound,
  getWorkspaceMembership,
} from "@/lib/api-helpers";

export const GET = withAuth(async (req, { userId, params }) => {
  const { workspaceId, projectId } = params;

  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId },
  });
  if (!project) return notFound("Project");

  const url   = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 50);

  const logs = await db.activityLog.findMany({
    where: { projectId },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      task: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return ok(logs);
});