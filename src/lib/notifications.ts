// Utility to find tasks due soon and send reminders

import { db } from "@/lib/db";
import { sendDueDateReminderEmail } from "@/lib/email";

interface TaskDueSoon {
  id: string;
  title: string;
  dueDate: Date;
  projectId: string;
  assigneeId: string | null;
  assignee: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  project: {
    id: string;
    name: string;
    workspaceId: string;
  };
}

/**
 * Find tasks that are due within 1-3 days and haven't had a notification sent yet.
 * Respects task status; only notifies for incomplete tasks.
 */
export async function findTasksDueSoon(daysBefore: number = 3) {
  const now = new Date();
  const dueStart = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 1 day from now
  const dueEnd = new Date(now.getTime() + 1000 * 60 * 60 * 24 * daysBefore); // N days from now

  const tasks = await db.task.findMany({
    where: {
      dueDate: {
        gte: dueStart,
        lte: dueEnd,
      },
      status: { not: "DONE" },   // Don't notify for completed tasks
      assigneeId: { not: null }, // Only tasks assigned to someone
      notificationSentAt: null,  // Not yet notified
    },
    include: {
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          workspaceId: true,
        },
      },
    },
  });

  return tasks as TaskDueSoon[];
}

/**
 * Send due date reminders for all tasks due soon.
 * Marks tasks as notified by setting notificationSentAt.
 * Returns the count of notifications sent.
 */
export async function sendDueDateReminders(daysBefore: number = 3): Promise<number> {
  const tasks = await findTasksDueSoon(daysBefore);
  let sent = 0;

  for (const task of tasks) {
    if (!task.assignee?.email) continue;

    try {
      const taskUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/${task.project.workspaceId}/projects/${task.projectId}`;

      await sendDueDateReminderEmail({
        to: task.assignee.email,
        toName: task.assignee.name,
        taskTitle: task.title,
        projectName: task.project.name,
        dueDate: task.dueDate,
        taskUrl,
      });

      // Mark as notified
      await db.task.update({
        where: { id: task.id },
        data: { notificationSentAt: new Date() },
      });

      sent++;
    } catch (err) {
      console.error(`[notifications] Failed to send reminder for task ${task.id}:`, err);
      // Continue to the next task instead of failing
    }
  }

  return sent;
}
