// GET  — list subtasks on a task (ordered by position)
// POST — create a new subtask on a task

import { db } from "@/lib/db";
import {
  withRateLimit,
  ok,
  created,
  error,
  forbidden,
  notFound,
  getWorkspaceMembership,
  parseBody,
} from "@/lib/api-helpers";
import { writeLimiter, readLimiter } from "@/lib/rate-limit";

export const GET = withRateLimit(readLimiter, async (_req, { userId, params }) => {
  const { workspaceId, projectId, taskId } = params;

  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();

  const task = await db.task.findFirst({
    where: { id: taskId, projectId },
  });
  if (!task) return notFound("Task");

  const subtasks = await db.subtask.findMany({
    where: { taskId },
    orderBy: { position: "asc" },
  });

  return ok(subtasks);
});

interface CreateSubtaskBody {
  title: string;
}

export const POST = withRateLimit(writeLimiter, async (req, { userId, params }) => {
  const { workspaceId, projectId, taskId } = params;

  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();

  const task = await db.task.findFirst({
    where: { id: taskId, projectId },
  });
  if (!task) return notFound("Task");

  const body = await parseBody<CreateSubtaskBody>(req);
  if (!body?.title?.trim()) return error("title is required");

  // Get max position to insert at the end
  const lastSubtask = await db.subtask.findFirst({
    where: { taskId },
    orderBy: { position: "desc" },
  });

  const subtask = await db.subtask.create({
    data: {
      taskId,
      title: body.title.trim(),
      position: (lastSubtask?.position ?? -1) + 1,
    },
  });

  return created(subtask);
});
