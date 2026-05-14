"use client";
import { useEffect } from "react";
import useSWR from "swr";
import { useApiFetcher, useApiMutation } from "@/lib/api-client";
import { supabase } from "@/lib/supabase-client";
import type { Comment } from "@/types";

export function useComments(workspaceId: string, projectId: string, taskId: string) {
  const fetcher = useApiFetcher();
  const mutator = useApiMutation();

  const { data, error, isLoading, mutate } = useSWR<Comment[]>(
    workspaceId && projectId && taskId ? `/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments` : null,
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
        table: "Comment",
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

  async function createComment(content: string) {
    const comment = await mutator<Comment>(
      `/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`,
      "POST",
      { content }
    );
    await mutate((current) => [...(current || []), comment], { revalidate: false });
    return comment;
  }

  return {
    comments: data || [],
    isLoading,
    error,
    createComment,
  };
}