// GET  — list comments on a task (ordered by creation)
// POST — create a new comment on a task

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

export const GET = withAuth(async (_req, { userId, params }) => {
  const { workspaceId, projectId, taskId } = params;

  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();

  const task = await db.task.findFirst({
    where: { id: taskId, projectId },
  });
  if (!task) return notFound("Task");

  const comments = await db.comment.findMany({
    where: { taskId },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return ok(comments);
});

interface CreateCommentBody {
  content: string;
}

export const POST = withAuth(async (req, { userId, params }) => {
  const { workspaceId, projectId, taskId } = params;

  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();

  const task = await db.task.findFirst({
    where: { id: taskId, projectId },
  });
  if (!task) return notFound("Task");

  const body = await parseBody<CreateCommentBody>(req);
  if (!body?.content?.trim()) return error("content is required");

  const comment = await db.comment.create({
    data: {
      taskId,
      authorId: userId,
      content: body.content.trim(),
    },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return created(comment);
});