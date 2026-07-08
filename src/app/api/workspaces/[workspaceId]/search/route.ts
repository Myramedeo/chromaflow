// GET  — workspace-scoped search for projects and tasks

import { db } from "@/lib/db";
import { withRateLimit, ok, forbidden } from "@/lib/api-helpers";
import { readLimiter } from "@/lib/rate-limit";

export const GET = withRateLimit(readLimiter, async (req, { userId, params }) => {
  const { workspaceId } = params;
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);

  if (!q) return ok({ projects: [], tasks: [] });

  // Ensure caller is a workspace member
  const membership = await (await import("@/lib/api-helpers")).getWorkspaceMembership(userId, workspaceId);
  if (!membership) return forbidden();

  const term = q;

  const [projects, tasks] = await Promise.all([
    db.project.findMany({
      where: {
        workspaceId,
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
        ],
      },
      take: limit,
    }),
    db.task.findMany({
      where: {
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
        ],
        project: { workspaceId },
      },
      include: { project: { select: { id: true, name: true } } },
      take: limit,
    }),
  ]);

  return ok({ projects, tasks });
});
