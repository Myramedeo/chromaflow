// GET    — get project with tasks summary
// PATCH  — update project fields
// DELETE — soft-delete (archive) the project

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
import { logActivity, ACTIONS } from "@/lib/activity";

async function getProjectOrForbid(
  userId: string,
  workspaceId: string,
  projectId: string
) {
  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return { project: null, membership: null };

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId },
  });

  return { project, membership };
}

export const GET = withAuth(async (_req, { userId, params }) => {
  const { workspaceId, projectId } = params;
  const { project, membership } = await getProjectOrForbid(userId, workspaceId, projectId);

  if (!membership) return forbidden();
  if (!project) return notFound("Project");

  const projectWithDetails = await db.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        orderBy: { position: "asc" },
        include: {
          assignee: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
      _count: { select: { tasks: true } },
    },
  });

  return ok(projectWithDetails);
});

interface UpdateProjectBody {
  name?: string;
  description?: string;
  color?: string;
  status?: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  [key: string]: unknown;
}

export const PATCH = withAuth(async (req, { userId, params }) => {
  const { workspaceId, projectId } = params;
  const { project, membership } = await getProjectOrForbid(userId, workspaceId, projectId);

  if (!membership) return forbidden();
  if (!project) return notFound("Project");

  const body = await parseBody<UpdateProjectBody>(req);
  if (!body) return error("Invalid request body");

  const updated = await db.project.update({
    where: { id: projectId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.status !== undefined && { status: body.status }),
    },
  });

  await logActivity({
    userId,
    projectId,
    action: ACTIONS.UPDATED_PROJECT,
    metadata: body,
  });

  return ok(updated);
});

export const DELETE = withAuth(async (_req, { userId, params }) => {
  const { workspaceId, projectId } = params;
  const { project, membership } = await getProjectOrForbid(userId, workspaceId, projectId);

  if (!membership) return forbidden();
  if (!project) return notFound("Project");

  // Only OWNER or ADMIN can delete projects
  if (!["OWNER", "ADMIN"].includes(membership.role)) {
    return forbidden();
  }

  // Soft delete — archive rather than hard delete
  const archived = await db.project.update({
    where: { id: projectId },
    data: { status: "ARCHIVED" },
  });

  await logActivity({
    userId,
    projectId,
    action: ACTIONS.ARCHIVED_PROJECT,
  });

  return ok(archived);
});