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
import { getWorkspaceSubscription } from "@/lib/subscription";
import { PLAN_LIMITS, PLAN_LIMIT_ERROR } from "@/lib/plans";

import { NextResponse } from "next/server";

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
  backgroundImageUrl?: string;
}

export const POST = withAuth(async (req, { userId, params }) => {
  const { workspaceId } = params;

  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();

  const body = await parseBody<CreateProjectBody>(req);
  if (!body?.name) return error("name is required");

  // ── Plan gate ──────────────────────────────────────────────────────────────
  const sub    = await getWorkspaceSubscription(workspaceId);
  const limits = PLAN_LIMITS[sub.plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.FREE;
 
  if (limits.projects !== Infinity) {
    const count = await db.project.count({
      where: { workspaceId, status: { not: "ARCHIVED" } },
    });
    if (count >= limits.projects) {
      return error(
        `Free plan is limited to ${limits.projects} projects. Upgrade to Pro for unlimited projects.`,
        403
      );
      // Note: the response body also includes { code: PLAN_LIMIT_ERROR }
      // so the frontend can detect this specific error type.
      // Since our error() helper doesn't support extra fields, we inline it:
    }
    if (count >= limits.projects) {
      return NextResponse.json(
        {
          error: `Free plan is limited to ${limits.projects} projects. Upgrade to Pro for unlimited projects.`,
          code: PLAN_LIMIT_ERROR,
        },
        { status: 403 }
      );
    }
  }
  // ── End plan gate ──────────────────────────────────────────────────────────

  const project = await db.project.create({
    data: {
      workspaceId,
      name: body.name,
      description: body.description ?? null,
      color: body.color ?? "#6366f1",
      backgroundImageUrl: body.backgroundImageUrl ?? null,
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