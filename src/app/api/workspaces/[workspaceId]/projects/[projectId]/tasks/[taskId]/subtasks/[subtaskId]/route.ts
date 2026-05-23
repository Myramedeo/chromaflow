// PATCH  — update a subtask (title, completed, position)
// DELETE — delete a subtask

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

interface UpdateSubtaskBody {
  title?: string;
  completed?: boolean;
  position?: number;
  [key: string]: unknown;
}

export const PATCH = withAuth(async (req, { userId, params }) => {
  const { workspaceId, projectId, taskId, subtaskId } = params;

  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();

  const task = await db.task.findFirst({
    where: { id: taskId, projectId },
  });
  if (!task) return notFound("Task");

  const subtask = await db.subtask.findFirst({
    where: { id: subtaskId, taskId },
  });
  if (!subtask) return notFound("Subtask");

  const body = await parseBody<UpdateSubtaskBody>(req);
  if (!body) return error("Invalid request body");

  const updated = await db.subtask.update({
    where: { id: subtaskId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.completed !== undefined && { completed: body.completed }),
      ...(body.position !== undefined && { position: body.position }),
    },
  });

  return ok(updated);
});

export const DELETE = withAuth(async (_req, { userId, params }) => {
  const { workspaceId, projectId, taskId, subtaskId } = params;

  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();

  const task = await db.task.findFirst({
    where: { id: taskId, projectId },
  });
  if (!task) return notFound("Task");

  const subtask = await db.subtask.findFirst({
    where: { id: subtaskId, taskId },
  });
  if (!subtask) return notFound("Subtask");

  await db.subtask.delete({
    where: { id: subtaskId },
  });

  return ok({ message: "Subtask deleted" });
});
