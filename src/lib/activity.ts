// Thin wrapper around Prisma to write ActivityLog entries.
// Call this inside any route handler that mutates data.

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

interface LogActivityParams {
  userId: string;
  action: string;
  projectId?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity({
  userId,
  action,
  projectId,
  taskId,
  metadata,
}: LogActivityParams) {
  try {
    await db.activityLog.create({
      data: {
        userId,
        action,
        projectId: projectId ?? null,
        taskId: taskId ?? null,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (err) {
    // Never let activity logging crash the main request
    console.error("[activity] Failed to log:", err);
  }
}

// Action constants — use these strings everywhere for consistency
export const ACTIONS = {
  CREATED_WORKSPACE: "created_workspace",
  CREATED_PROJECT: "created_project",
  UPDATED_PROJECT: "updated_project",
  ARCHIVED_PROJECT: "archived_project",
  CREATED_TASK: "created_task",
  UPDATED_TASK: "updated_task",
  MOVED_TASK: "moved_task",
  ASSIGNED_TASK: "assigned_task",
  DELETED_TASK: "deleted_task",
} as const;