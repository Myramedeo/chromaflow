// GET — export all tasks in a project as PDF

import PDFDocument from "pdfkit";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import {
  withRateLimit,
  forbidden,
  notFound,
  getWorkspaceMembership,
} from "@/lib/api-helpers";
import { readLimiter } from "@/lib/rate-limit";

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

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk) => chunks.push(chunk));

  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.fontSize(20).text(`${project.name} Tasks`, { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("gray").text(`Exported: ${new Date().toLocaleString()}`);
  doc.fillColor("black");
  doc.moveDown(1);

  tasks.forEach((task, index) => {
    doc.fontSize(12).font("Helvetica-Bold").text(`${index + 1}. ${task.title}`);
    doc.fontSize(10).font("Helvetica").text(
      `Status: ${task.status}    Priority: ${task.priority}    Due: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "-"}`
    );
    doc.text(`Assignee: ${task.assignee?.name ?? task.assignee?.email ?? "Unassigned"}`);
    doc.text(`Created by: ${task.creator.name ?? task.creator.id}`);
    if (task.description) {
      doc.moveDown(0.1);
      doc.font("Helvetica-Oblique").text(`Description: ${task.description}`);
      doc.font("Helvetica");
    }
    doc.moveDown(0.8);

    if (doc.y > 720) {
      doc.addPage();
      doc.moveDown(0.5);
    }
  });

  doc.end();
  const pdfBuffer = await finished;
  const pdfArray = new Uint8Array(pdfBuffer);

  const filename = `${project.name}-tasks-${new Date().toISOString().split("T")[0]}.pdf`;

  return new NextResponse(pdfArray, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
