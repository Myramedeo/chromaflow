// GET  /api/workspaces  — list workspaces the user belongs to
// POST /api/workspaces  — create a new workspace (creator auto-added as OWNER)

import { db } from "@/lib/db";
import {
  withAuth,
  ok,
  created,
  error,
  parseBody,
} from "@/lib/api-helpers";
import { logActivity, ACTIONS } from "@/lib/activity";

export const GET = withAuth(async (_req, { userId }) => {
  const memberships = await db.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          _count: { select: { members: true, projects: true } },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const workspaces = memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
  }));

  return ok(workspaces);
});

interface CreateWorkspaceBody {
  name: string;
  slug: string;
}

export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody<CreateWorkspaceBody>(req);

  if (!body?.name || !body?.slug) {
    return error("name and slug are required");
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(body.slug)) {
    return error("slug may only contain lowercase letters, numbers, and hyphens");
  }

  // Check slug uniqueness
  const existing = await db.workspace.findUnique({
    where: { slug: body.slug },
  });

  if (existing) {
    return error("A workspace with that slug already exists", 409);
  }

  // Create workspace + membership in one transaction
  const workspace = await db.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: { name: body.name, slug: body.slug },
    });

    await tx.workspaceMember.create({
      data: { userId, workspaceId: ws.id, role: "OWNER" },
    });

    return ws;
  });

  await logActivity({
    userId,
    action: ACTIONS.CREATED_WORKSPACE,
    metadata: { workspaceId: workspace.id, name: workspace.name },
  });

  return created(workspace);
});