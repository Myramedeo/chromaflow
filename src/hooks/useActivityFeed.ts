// Fetches activity log entries via SWR and subscribes to Supabase Realtime
// so new entries appear in the feed without a page refresh.

"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { useApiFetcher } from "@/lib/api-client";
import { supabase } from "@/lib/supabase-client";

export interface ActivityEntry {
  id: string;
  action: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  user: { id: string; name: string | null; avatarUrl: string | null };
  task: { id: string; title: string } | null;
}

// Maps action strings from activity.ts ACTIONS to readable sentences
export function formatAction(entry: ActivityEntry): string {
  const meta = entry.metadata ?? {};
  switch (entry.action) {
    case "created_task":
      return `created task "${meta.title ?? "Untitled"}"`
    case "moved_task":
      return `moved a task from ${formatStatus(String(meta.from))} to ${formatStatus(String(meta.to))}`;
    case "assigned_task":
      return "assigned a task";
    case "updated_task":
      return "updated a task";
    case "deleted_task":
      return `deleted task "${meta.title ?? "Untitled"}"`;
    case "created_project":
      return `created project "${meta.name ?? ""}"`;
    case "updated_project":
      return "updated project settings";
    case "archived_project":
      return "archived the project";
    case "created_workspace":
      return `created workspace "${meta.name ?? ""}"`;
    default:
      return entry.action.replace(/_/g, " ");
  }
}

function formatStatus(status: string): string {
  return status.toLowerCase().replace(/_/g, " ");
}

export function useActivityFeed(workspaceId: string, projectId: string) {
  const fetcher = useApiFetcher();
  const key = `/api/workspaces/${workspaceId}/projects/${projectId}/activity`;

  const { data, error, isLoading, mutate } = useSWR<ActivityEntry[]>(
    key,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Subscribe to new ActivityLog rows for this project
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`activity:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ActivityLog",
          filter: `projectId=eq.${projectId}`,
        },
        () => {
          // Refetch the full list — simpler than prepending the partial payload
          mutate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, mutate]);

  return {
    entries: data ?? [],
    isLoading,
    error,
  };
}