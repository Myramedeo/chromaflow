// GET  — list tasks in a project (ordered by position for Kanban)
// POST — create a new task (auto-positions at end of its status column)

import { db } from "@/lib/db";
import {
  withAuth,
  ok,
  created,
  error,
  forbidden,
  notFound,
  getWorkspaceMembership,
  parseBody,
} from "@/lib/api-helpers";
import { logActivity, ACTIONS } from "@/lib/activity";
import { sendAssignmentNotificationEmail } from "@/lib/email";

export const GET = withAuth(async (_req, { userId, params }) => {
  const { workspaceId, projectId } = params;

  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId },
  });
  if (!project) return notFound("Project");

  const tasks = await db.task.findMany({
    where: { projectId },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      creator:  { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { position: "asc" }],
  });

  return ok(tasks);
});

interface CreateTaskBody {
  title: string;
  description?: string;
  status?: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
  assigneeId?: string;
}

export const POST = withAuth(async (req, { userId, params }) => {
  const { workspaceId, projectId } = params;

  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId },
  });
  if (!project) return notFound("Project");

  const body = await parseBody<CreateTaskBody>(req);
  if (!body?.title) return error("title is required");

  const status = body.status ?? "TODO";

  // Position new task at the end of its status column
  const lastTask = await db.task.findFirst({
    where: { projectId, status },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const position = (lastTask?.position ?? 0) + 1000;

  const task = await db.task.create({
    data: {
      projectId,
      title: body.title,
      description: body.description ?? null,
      status,
      priority: body.priority ?? "MEDIUM",
      position,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      assigneeId: body.assigneeId ?? null,
      creatorId: userId,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      creator:  { select: { id: true, name: true } },
    },
  });

  await logActivity({
    userId,
    projectId,
    taskId: task.id,
    action: ACTIONS.CREATED_TASK,
    metadata: { title: task.title, status: task.status },
  });

  if (body.assigneeId && task.assignee?.email) {
    try {
      await sendAssignmentNotificationEmail({
        to: task.assignee.email,
        toName: task.assignee.name,
        taskTitle: task.title,
        projectName: project.name,
        assignerName: task.creator.name,
        taskUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin}/dashboard/${workspaceId}/projects/${projectId}`,
      });
    } catch (err) {
      console.error("Failed to send assignment notification email:", err);
    }
  }

  return created(task);
});