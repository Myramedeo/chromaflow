// Shared frontend types kept in sync with prisma/schema.prisma

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
export type ProjectStatus = "ACTIVE" | "ARCHIVED" | "COMPLETED";
export type TaskStatus   = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: User;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedById: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  invitedBy: User;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: WorkspaceRole;           // current user's role, injected by GET /api/workspaces
  _count: { members: number; projects: number };
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string;
  createdAt: string;
  _count: { tasks: number };
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  dueDate: string | null;
  assigneeId: string | null;
  creatorId: string;
  createdAt: string;
  assignee: Pick<User, "id" | "name" | "avatarUrl"> | null;
  creator: Pick<User, "id" | "name">;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: Pick<User, "id" | "name" | "avatarUrl">;
}

// Column definition used by the Kanban board
export interface KanbanColumn {
  id: TaskStatus;
  label: string;
  color: string;
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "TODO",        label: "To do",      color: "#94a3b8" },
  { id: "IN_PROGRESS", label: "In progress", color: "#6366f1" },
  { id: "IN_REVIEW",   label: "In review",  color: "#f59e0b" },
  { id: "DONE",        label: "Done",       color: "#22c55e" },
];

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  LOW:    { label: "Low",    color: "#94a3b8" },
  MEDIUM: { label: "Medium", color: "#6366f1" },
  HIGH:   { label: "High",   color: "#f59e0b" },
  URGENT: { label: "Urgent", color: "#ef4444" },
};