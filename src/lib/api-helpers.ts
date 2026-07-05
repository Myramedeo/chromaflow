import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { WorkspaceRole } from "@prisma/client";

import * as Sentry from "@sentry/nextjs";
 
// ── Response helpers ──────────────────────────────────────────────────────────
 
export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
 
export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}
 
export function error(
  message: string,
  status = 400,
  options?: { code?: string; details?: unknown }
) {
  return NextResponse.json(
    {
      error: message,
      ...(options?.code ? { code: options.code } : {}),
      ...(options?.details !== undefined ? { details: options.details } : {}),
    },
    { status }
  );
}
 
export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
 
export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
 
export function notFound(resource = "Resource") {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 });
}
 
// ── Auth guard ────────────────────────────────────────────────────────────────
// Wraps a route handler and injects the authenticated userId.
// Returns 401 automatically if no session exists.
 
type AuthedHandler = (
  request: Request,
  context: { params: Record<string, string>; userId: string }
) => Promise<NextResponse>;
 
export function withAuth(handler: AuthedHandler) {
  return async (
    request: Request,
    context: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const { userId } = await auth();
 
    if (!userId) {
      return unauthorized();
    }

    // Tag all errors in this request with the user
    Sentry.setUser({ id: userId });

    const params = await context.params;
    return handler(request, { params, userId });
  };
}
 
// ── Workspace membership guard ────────────────────────────────────────────────
// Verifies the user is a member of the given workspace.
// Returns the WorkspaceMember record, or null if not found.
 
import { db } from "@/lib/db";
 
export async function getWorkspaceMembership(
  userId: string,
  workspaceId: string
) {
  return db.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { workspace: true },
  });
}

export function hasWorkspaceRole(
  role: WorkspaceRole,
  allowedRoles: readonly WorkspaceRole[]
) {
  return allowedRoles.includes(role);
}
 
// ── Parse JSON body safely ────────────────────────────────────────────────────
 
export async function parseBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}