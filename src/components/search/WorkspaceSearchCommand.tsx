"use client";

import React, { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { useRouter, useParams } from "next/navigation";
import type { Project, Task } from "@/types";

export default function WorkspaceSearchCommand() {
  const router = useRouter();
  const params = useParams() as { workspaceId?: string };
  const workspaceId = params.workspaceId ?? "";

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const visibleProjects = query.trim() ? projects : [];
  const visibleTasks = query.trim() ? tasks : [];

  // Toggle via Ctrl/Cmd+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isK = e.key.toLowerCase() === "k";
      if ((e.ctrlKey || e.metaKey) && isK) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced fetch
  useEffect(() => {
    if (!open) return;
    
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects ?? []);
          setTasks(data.tasks ?? []);
        } else {
          setProjects([]);
          setTasks([]);
        }
      } catch (err) {
        setProjects([]);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(t);
  }, [query, open, workspaceId]);

  function goToProject(projectId: string) {
    setOpen(false);
    router.push(`/dashboard/${workspaceId}/projects/${projectId}`);
  }

  function goToTask(taskId: string, projectId: string) {
    setOpen(false);
    // Navigate to project and include taskId query param so UI can open it
    router.push(`/dashboard/${workspaceId}/projects/${projectId}?taskId=${taskId}`);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Search projects and tasks">
      <CommandInput value={query} onValueChange={setQuery} placeholder="Search projects and tasks..." />
      <CommandList>
        <CommandEmpty>{loading ? "Searching…" : "No results"}</CommandEmpty>

        {visibleProjects.length > 0 && (
          <>
            <CommandGroup>
              <div className="px-2 text-xs font-medium text-muted-foreground">Projects</div>
              {visibleProjects.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.description ?? ""}`}
                  onSelect={() => goToProject(p.id)}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{p.name}</span>
                    {p.description && <span className="text-xs text-muted-foreground">{p.description}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {visibleTasks.length > 0 && (
          <CommandGroup>
            <div className="px-2 text-xs font-medium text-muted-foreground">Tasks</div>
            {visibleTasks.map((t) => (
              <CommandItem
                key={t.id}
                value={`${t.title} ${t.project?.name ?? ""}`}
                onSelect={() => goToTask(t.id, t.project?.id ?? t.projectId)}
              >
                <div className="flex flex-col">
                  <span className="text-sm">{t.title}</span>
                  <span className="text-xs text-muted-foreground">{t.project?.name}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
