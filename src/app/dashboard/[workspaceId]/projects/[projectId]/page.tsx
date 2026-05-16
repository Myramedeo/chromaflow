"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { ActiveUsers } from "@/components/tasks/ActiveUsers";
import { ActivityFeed } from "@/components/tasks/ActivityFeed";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LayoutGrid, Download, ChevronDown, FileText } from "lucide-react";
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
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");

  const handleActiveUsersChange = useCallback((users: PresenceUser[]) => {
    setActiveUsers(users);
  }, []);

  const handleExport = async () => {
    if (!project) return;
    setIsExporting(true);
    try {
      await exportTasks(workspaceId, projectId, project.name, exportFormat);
      toast.success(`Tasks exported to ${exportFormat.toUpperCase()}`);
    } catch {
      toast.error("Failed to export tasks");
    } finally {
      setIsExporting(false);
    }
  };

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
 
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger>
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    {exportFormat.toUpperCase()}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="end" className="w-40 p-1">
                  <Button
                    variant={exportFormat === "csv" ? "secondary" : "ghost"}
                    size="sm"
                    className="justify-start w-full"
                    onClick={() => setExportFormat("csv")}
                  >
                    CSV
                  </Button>
                  <Button
                    variant={exportFormat === "pdf" ? "secondary" : "ghost"}
                    size="sm"
                    className="justify-start w-full"
                    onClick={() => setExportFormat("pdf")}
                  >
                    PDF
                  </Button>
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExport}
                disabled={isExporting || !project}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                {isExporting ? "Exporting..." : "Export"}
              </Button>
            </div>

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