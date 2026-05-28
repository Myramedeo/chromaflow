"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { ActiveUsers } from "@/components/tasks/ActiveUsers";
import { ActivityFeed } from "@/components/tasks/ActivityFeed";
import { EditProjectModal } from "@/components/projects/EditProjectModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Pencil } from "lucide-react";
import { ProjectExtrasMenu } from "@/components/projects/ProjectExtrasMenu";
import { toast } from "sonner";
import { exportTasks, type ExportFormat } from "@/lib/export";
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

  const handleExport = async (format: ExportFormat) => {
  if (!project) return;

  try {
    await exportTasks(
      workspaceId,
      projectId,
      project.name,
      format
    );

    toast.success(`Tasks exported to ${format.toUpperCase()}`);
  } catch {
    toast.error("Failed to export tasks");
  }
};

  return (
    <div 
      className="flex h-full flex-col relative"
      style={{
        backgroundImage: project?.backgroundImageUrl 
          ? `url(${project.backgroundImageUrl})` 
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="relative z-10 flex h-full flex-col">
        {/* Page header */}
        <div className="relative">
          {/* Dark overlay for header readability - only behind the header */}
          {project?.backgroundImageUrl && (
            <div className="absolute inset-0 bg-black/30 pointer-events-none" />
          )}
          <div className="flex items-center gap-3 border-b border-gray-200 bg-white/95 px-6 py-4 dark:border-gray-700 dark:bg-gray-800/95 relative z-20">
          {isLoading ? (
            <Skeleton className="h-5 w-48" />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: project?.color ?? "#6366f1" }}
                />

                <h1 className="text-base font-semibold text-gray-900 dark:text-white">
                  {project?.name ?? "Project"}
                </h1>

                {project && (
                  <EditProjectModal
                    workspaceId={workspaceId}
                    project={project}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-900 hover:bg-gray-200/60 dark:text-white dark:hover:bg-gray-700/60"
                      >
                        <Pencil className="h-4.5 w-4.5" />
                      </Button>
                    }
                  />
                )}

                {project?.description && (
                  <span className="ml-1 text-sm text-gray-400 dark:text-gray-500">
                    — {project.description}
                  </span>
                )}
              </div>

              <div className="flex-1" />

              {/* Live viewer avatars */}
              <ActiveUsers users={activeUsers} />

              <ProjectExtrasMenu
                workspaceId={workspaceId}
                projectId={projectId}
                projectName={project?.name ?? ""}
                onExport={handleExport}
                disabled={!project}
              />

              <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
                <LayoutGrid className="h-3.5 w-3.5" />
                Kanban
              </div>
            </>
          )}
        </div>
        </div>

        {/* Board area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Scrollable kanban section */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="w-max">
              <KanbanBoard
                workspaceId={workspaceId}
                projectId={projectId}
                onActiveUsersChange={handleActiveUsersChange}
              />
            </div>
          </div>

          {/* Fixed sidebar */}
          <ActivityFeed
            workspaceId={workspaceId}
            projectId={projectId}
          />
        </div>
      </div>
    </div>
  );
}