"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { ActiveUsers } from "@/components/tasks/ActiveUsers";
import { ActivityFeed } from "@/components/tasks/ActivityFeed";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid } from "lucide-react";
import type { PresenceUser } from "@/hooks/useRealtimeTasks";

export default function ProjectPage() {
  const { workspaceId, projectId } = useParams<{
    workspaceId: string;
    projectId: string;
  }>();

  const { projects, isLoading } = useProjects(workspaceId);
  const project = projects.find((p) => p.id === projectId);
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);

  const handleActiveUsersChange = useCallback((users: PresenceUser[]) => {
    setActiveUsers(users);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-6 py-4">
        {isLoading ? (
          <Skeleton className="h-5 w-48" />
        ) : (
          <>
            <span
              className="h-3 w-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: project?.color ?? "#6366f1" }}
            />
            <h1 className="text-base font-semibold text-gray-900">
              {project?.name ?? "Project"}
            </h1>
            {project?.description && (
              <span className="ml-1 text-sm text-gray-400">
                — {project.description}
              </span>
            )}

            <div className="flex-1" />
 
            {/* Live viewer avatars */}
            <ActiveUsers users={activeUsers} />

            <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
              <LayoutGrid className="h-3.5 w-3.5" />
              Kanban
            </div>
          </>
        )}
      </div>

      {/* Board — fills remaining height, scrolls horizontally */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <KanbanBoard 
            workspaceId={workspaceId} 
            projectId={projectId} 
            onActiveUsersChange={handleActiveUsersChange}
          />
        </div>
        <ActivityFeed workspaceId={workspaceId} projectId={projectId} />
      </div>
    </div>
  );
}