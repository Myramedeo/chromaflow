// GET   /api/workspaces/[workspaceId]  — get workspace + members
// PATCH /api/workspaces/[workspaceId]  — update name/slug (OWNER/ADMIN only)

import { db } from "@/lib/db";
import {
  withAuth,
  ok,
  error,
  forbidden,
  notFound,
  getWorkspaceMembership,
  parseBody,
} from "@/lib/api-helpers";

export const GET = withAuth(async (_req, { userId, params }) => {
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

export const PATCH = withAuth(async (req, { userId, params }) => {
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