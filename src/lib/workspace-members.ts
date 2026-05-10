import type { WorkspaceRole } from "@prisma/client";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function canManageWorkspace(actorRole: WorkspaceRole) {
  return actorRole === "OWNER" || actorRole === "ADMIN";
}

export function canAssignRole(actorRole: WorkspaceRole, nextRole: WorkspaceRole) {
  if (actorRole === "OWNER") return true;
  if (actorRole === "ADMIN") return nextRole === "MEMBER";
  return false;
}

export function canRemoveMember(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole
) {
  if (actorRole === "OWNER") return true;
  if (actorRole === "ADMIN") return targetRole === "MEMBER";
  return false;
}
