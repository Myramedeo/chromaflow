// GET  /api/workspaces/[workspaceId]/projects  — list projects in workspace
// POST /api/workspaces/[workspaceId]/projects  — create a project

import { db } from "@/lib/db";
import {
  withAuth,
  ok,
  created,
  error,
  forbidden,
  getWorkspaceMembership,
  parseBody,
} from "@/lib/api-helpers";
import { logActivity, ACTIONS } from "@/lib/activity";

export const GET = withAuth(async (_req, { userId, params }) => {
  const { workspaceId } = params;

  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();

  const projects = await db.project.findMany({
    where: {
      workspaceId,
      status: { not: "ARCHIVED" }, // hide archived by default
    },
    include: {
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return ok(projects);
});

interface CreateProjectBody {
  name: string;
  description?: string;
  color?: string;
}

export const POST = withAuth(async (req, { userId, params }) => {
  const { workspaceId } = params;

  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();

  const body = await parseBody<CreateProjectBody>(req);
  if (!body?.name) return error("name is required");

  const project = await db.project.create({
    data: {
      workspaceId,
      name: body.name,
      description: body.description ?? null,
      color: body.color ?? "#6366f1",
    },
  });

  await logActivity({
    userId,
    projectId: project.id,
    action: ACTIONS.CREATED_PROJECT,
    metadata: { name: project.name },
  });

  return created(project);
});