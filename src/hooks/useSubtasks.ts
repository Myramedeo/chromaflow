"use client";
import { useEffect } from "react";
import useSWR from "swr";
import { useApiFetcher, useApiMutation } from "@/lib/api-client";
import { supabase } from "@/lib/supabase-client";
import type { Subtask } from "@/types";

export function useSubtasks(workspaceId: string, projectId: string, taskId: string) {
  const fetcher = useApiFetcher();
  const mutator = useApiMutation();

  const { data, error, isLoading, mutate } = useSWR<Subtask[]>(
    workspaceId && projectId && taskId ? `/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/subtasks` : null,
    fetcher
  );

  useEffect(() => {
    if (!taskId) return;

    const channelName = `task:${taskId}`;

    // Remove any stale channel
    const existing = supabase.getChannels()
      .find((c) => c.topic === `realtime:${channelName}`);

    if (existing) {
      supabase.removeChannel(existing);
    }

    const channel = supabase.channel(channelName);

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "Subtask",
        filter: `taskId=eq.${taskId}`,
      },
      () => {
        mutate();
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, mutate]);

  async function createSubtask(title: string) {
    const subtask = await mutator<Subtask>(
      `/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/subtasks`,
      "POST",
      { title }
    );
    await mutate((current) => [...(current || []), subtask], { revalidate: false });
    return subtask;
  }

  async function updateSubtask(subtaskId: string, updates: Partial<Subtask>) {
    const subtask = await mutator<Subtask>(
      `/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`,
      "PATCH",
      updates
    );
    await mutate((current) =>
      (current || []).map((s) => (s.id === subtaskId ? subtask : s)),
      { revalidate: false }
    );
    return subtask;
  }

  async function deleteSubtask(subtaskId: string) {
    await mutator(
      `/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`,
      "DELETE"
    );
    await mutate((current) => (current || []).filter((s) => s.id !== subtaskId), { revalidate: false });
  }

  return {
    subtasks: data || [],
    isLoading,
    error,
    createSubtask,
    updateSubtask,
    deleteSubtask,
  };
}
