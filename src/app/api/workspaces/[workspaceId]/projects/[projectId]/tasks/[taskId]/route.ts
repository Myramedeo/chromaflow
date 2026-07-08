// PATCH  — partial update (status, position, title, priority, assignee, due date)
// DELETE — hard delete a task

import { db } from "@/lib/db";
import {
  withRateLimit,
  ok,
  error,
  forbidden,
  notFound,
  getWorkspaceMembership,
  parseBody,
} from "@/lib/api-helpers";
import { logActivity, ACTIONS } from "@/lib/activity";
import { sendAssignmentNotificationEmail } from "@/lib/email";
import { writeLimiter } from "@/lib/rate-limit";

interface UpdateTaskBody {
  title?: string;
  description?: string;
  imageUrl?: string | null;
  status?: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  position?: number;
  dueDate?: string | null;
  assigneeId?: string | null;
  [key: string]: unknown;
}

export const PATCH = withRateLimit(writeLimiter, async (req, { userId, params }) => {
  const { workspaceId, projectId, taskId } = params;

  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId },
  });
  if (!project) return notFound("Project");

  const task = await db.task.findFirst({
    where: { id: taskId, projectId },
  });
  if (!task) return notFound("Task");

  const body = await parseBody<UpdateTaskBody>(req);
  if (!body) return error("Invalid request body");

  const prevStatus = task.status;
  const prevAssigneeId = task.assigneeId;

  const updated = await db.task.update({
    where: { id: taskId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.position !== undefined && { position: body.position }),
      ...(body.dueDate !== undefined && {
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        // Reset notification sent flag when due date changes so it can be reminded again
        notificationSentAt: null,
      }),
      ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId }),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      creator:  { select: { id: true, name: true } },
    },
  });

  // Log different action types for better activity feed UX
  if (body.status && body.status !== prevStatus) {
    await logActivity({
      userId,
      projectId,
      taskId,
      action: ACTIONS.MOVED_TASK,
      metadata: { from: prevStatus, to: body.status },
    });
  } else if (body.assigneeId !== undefined) {
    await logActivity({
      userId,
      projectId,
      taskId,
      action: ACTIONS.ASSIGNED_TASK,
      metadata: { assigneeId: body.assigneeId },
    });
  } else {
    await logActivity({
      userId,
      projectId,
      taskId,
      action: ACTIONS.UPDATED_TASK,
      metadata: body,
    });
  }

  if (body.assigneeId !== undefined && body.assigneeId !== prevAssigneeId && updated.assignee?.email) {
    try {
      await sendAssignmentNotificationEmail({
        to: updated.assignee.email,
        toName: updated.assignee.name,
        taskTitle: updated.title,
        projectName: project.name,
        assignerName: updated.creator.name,
        taskUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin}/dashboard/${workspaceId}/projects/${projectId}`,
      });
    } catch (err) {
      console.error("Failed to send assignment notification email:", err);
    }
  }

  return ok(updated);
});

export const DELETE = withRateLimit(writeLimiter, async (_req, { userId, params }) => {
  const { workspaceId, projectId, taskId } = params;

  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();

  const task = await db.task.findFirst({
    where: { id: taskId, projectId },
  });
  if (!task) return notFound("Task");

  await db.task.delete({ where: { id: taskId } });

  await logActivity({
    userId,
    projectId,
    taskId,
    action: ACTIONS.DELETED_TASK,
    metadata: { title: task.title },
  });

  return ok({ deleted: true });
});