// GET — export all tasks in a project as CSV

import { db } from "@/lib/db";
import {
  withRateLimit,
  forbidden,
  notFound,
  getWorkspaceMembership,
} from "@/lib/api-helpers";
import { NextResponse } from "next/server";
import { readLimiter } from "@/lib/rate-limit";
import Papa from "papaparse";

export const GET = withRateLimit(readLimiter, async (_req, { userId, params }) => {
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
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { position: "asc" }],
  });

  // Transform tasks for CSV export
  const csvData = tasks.map((task) => ({
    ID: task.id,
    Title: task.title,
    Description: task.description ?? "",
    Status: task.status,
    Priority: task.priority,
    "Due Date": task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "",
    Assignee: task.assignee?.name ?? task.assignee?.email ?? "Unassigned",
    "Created By": task.creator.name ?? task.creator.id,
    "Created At": new Date(task.createdAt).toLocaleDateString(),
  }));

  // Generate CSV using papaparse
  const csv = Papa.unparse(csvData);

  // Return as downloadable file
  const filename = `${project.name}-tasks-${new Date().toISOString().split("T")[0]}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
