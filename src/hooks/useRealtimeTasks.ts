// Extends useTasks with:
//   1. A Supabase Realtime subscription scoped to the current projectId
//      Any INSERT / UPDATE / DELETE on the Task table triggers a cache refresh
//   2. Presence tracking broadcasts the current user's identity on the channel
//      and maintains a live list of who else is viewing the same board

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase-client";
import { useTasks } from "@/hooks/useTasks";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface PresenceUser {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
}

export function useRealtimeTasks(workspaceId: string, projectId: string) {
  const taskHelpers = useTasks(workspaceId, projectId);
  const { mutate: originalMutate } = taskHelpers;
  const { user } = useUser();
  
  const userId = user?.id;
  const userName = user?.fullName ?? null;
  const userAvatarUrl = user?.imageUrl ?? null;

  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const pendingUpdates = useRef<Set<string>>(new Set()); // Track task IDs with pending API calls

  // Wrap mutate to track when local updates happen
  const mutate = useCallback(
    (...args: Parameters<typeof originalMutate>) => {
      return originalMutate(...args);
    },
    [originalMutate]
  );

  useEffect(() => {
    if (!projectId) return;

    // Channel name is scoped to the project so users only receive events
    // for the board they're currently viewing
    const channelName = `project:${projectId}`;

    // Remove any stale channel with the same name
    const existing = supabase.getChannels()
      .find((c) => c.topic === `realtime:${channelName}`);

    if (existing) {
      supabase.removeChannel(existing);
    }

    const channel: RealtimeChannel = supabase.channel(channelName, {
      config: { presence: { key: userId ?? "anonymous" } },
    });

    // ── 1. Database change listener ──────────────────────────────────────────
    // Filters events to only this project's tasks, avoids cross-project noise
    channel.on(
      "postgres_changes",
      {
        event: "*",       // INSERT | UPDATE | DELETE
        schema: "public",
        table: "Task",
        filter: `projectId=eq.${projectId}`,
      },
      (payload) => {
        // Skip refetch if we just initiated this update locally
        // The API response will already update the cache correctly
        const newRow =
          payload.new && "id" in payload.new ? payload.new : undefined;

        const oldRow =
          payload.old && "id" in payload.old ? payload.old : undefined;

        const taskId = newRow?.id ?? oldRow?.id;

        if (taskId && pendingUpdates.current.has(taskId)) {
          return;
        }
        // Re-fetch tasks from the server so every client converges to the
        // same ground truth. SWR de-dupes rapid calls automatically.
        mutate();
      }
    );

    // ── 2. Presence ──────────────────────────────────────────────────────────
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresenceUser>();
      // presenceState returns { [key]: PresenceUser[] } — flatten to a unique list
      const users = Object.values(state)
        .flat()
        .filter(
          (u, idx, arr) => arr.findIndex((x) => x.userId === u.userId) === idx
        );
      setActiveUsers(users);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED" && userId) {
        // Broadcast this user's presence to all others on the channel
        await channel.track({
          userId,
          name: userName,
          avatarUrl: userAvatarUrl,
        } satisfies PresenceUser);
      }
    });

    // Cleanup: untrack presence and unsubscribe when component unmounts
    // or projectId changes (e.g. user navigates to a different board)
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, userId, userName, userAvatarUrl, mutate]);

  // Wrap task helpers to track pending updates and avoid Realtime snap-backs
  const updateTaskWithTracking = useCallback(
    async (taskId: string, payload: Parameters<typeof taskHelpers.updateTask>[1]) => {
      pendingUpdates.current.add(taskId);
      try {
        const result = await taskHelpers.updateTask(taskId, payload);
        return result;
      } finally {
        // Remove from pending after sufficient delay to catch the Realtime event
        // Network latency + database write + Realtime propagation can take 200-500ms
        setTimeout(() => pendingUpdates.current.delete(taskId), 500);
      }
    },
    [taskHelpers]
  );

  const deleteTaskWithTracking = useCallback(
    async (taskId: string) => {
      pendingUpdates.current.add(taskId);
      try {
        const result = await taskHelpers.deleteTask(taskId);
        return result;
      } finally {
        setTimeout(() => pendingUpdates.current.delete(taskId), 500);
      }
    },
    [taskHelpers]
  );

  return {
    ...taskHelpers,
    activeUsers,
    updateTask: updateTaskWithTracking,
    deleteTask: deleteTaskWithTracking,
  };
}