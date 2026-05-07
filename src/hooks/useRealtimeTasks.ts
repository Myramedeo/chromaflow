// Extends useTasks with:
//   1. A Supabase Realtime subscription scoped to the current projectId
//      Any INSERT / UPDATE / DELETE on the Task table triggers a cache refresh
//   2. Presence tracking broadcasts the current user's identity on the channel
//      and maintains a live list of who else is viewing the same board

"use client";

import { useEffect, useState } from "react";
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
  const { mutate } = taskHelpers;
  const { user } = useUser();
  
  const userId = user?.id;
  const userName = user?.fullName ?? null;
  const userAvatarUrl = user?.imageUrl ?? null;

  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);

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
      () => {
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

  return { ...taskHelpers, activeUsers };
}