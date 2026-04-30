"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@/types";
import { LayoutGrid } from "lucide-react";

interface Props {
  project: Project;
  workspaceId: string;
}

export function ProjectCard({ project, workspaceId }: Props) {
  return (
    <Link href={`/dashboard/${workspaceId}/projects/${project.id}`}>
      <div className="group relative flex h-36 flex-col justify-between overflow-hidden rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md">
        {/* Color accent bar */}
        <span
          className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
          style={{ backgroundColor: project.color }}
        />

        <div className="pl-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-gray-900 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
              {project.name}
            </h3>
            <LayoutGrid className="h-4 w-4 flex-shrink-0 text-gray-300 group-hover:text-indigo-400 transition-colors" />
          </div>
          {project.description && (
            <p className="mt-1 text-xs text-gray-400 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 pl-2">
          <Badge variant="secondary" className="text-[11px]">
            {project._count.tasks} task{project._count.tasks !== 1 ? "s" : ""}
          </Badge>
          {project.status !== "ACTIVE" && (
            <Badge variant="outline" className="text-[11px] capitalize">
              {project.status.toLowerCase()}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}