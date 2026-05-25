"use client";

import { useParams } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";

export default function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { projects, isLoading } = useProjects(workspaceId);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Projects</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isLoading ? "Loading…" : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <CreateProjectModal workspaceId={workspaceId}>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </CreateProjectModal>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-20 text-center dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No projects yet</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Create your first project to get started</p>
          <CreateProjectModal workspaceId={workspaceId}>
            <Button variant="outline" size="sm" className="mt-4 gap-1.5">
              <Plus className="h-4 w-4" />
              New project
            </Button>
          </CreateProjectModal>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              workspaceId={workspaceId}
            />
          ))}
        </div>
      )}
    </div>
  );
}