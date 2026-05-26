// src/components/tasks/ActivityFeed.tsx
// Collapsible right sidebar showing a live stream of project activity.
// Driven by useActivityFeed, new entries appear without a page refresh.

"use client";

import { useState } from "react";
import { useActivityFeed, formatAction, type ActivityEntry } from "@/hooks/useActivityFeed";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, Activity } from "lucide-react";

interface Props {
  workspaceId: string;
  projectId: string;
}

function ActivityAvatar({ entry }: { entry: ActivityEntry }) {
  const { user } = entry;
  const initials = user.name
    ? user.name.trim().split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt={user.name ?? "User"}
        className="h-6 w-6 flex-shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[9px] font-bold text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
      {initials}
    </div>
  );
}

function ActivityItem({ entry }: { entry: ActivityEntry }) {
  const timeAgo = formatDistanceToNow(new Date(entry.createdAt), {
    addSuffix: true,
  });

  return (
    <div className="flex gap-2.5 py-2.5 border-b border-gray-100 last:border-0 dark:border-gray-700">
      <ActivityAvatar entry={entry} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-700 leading-relaxed dark:text-gray-300">
          <span className="font-medium dark:text-gray-200">{entry.user.name ?? "Someone"}</span>{" "}
          {formatAction(entry)}
        </p>
        <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">{timeAgo}</p>
      </div>
    </div>
  );
}

export function ActivityFeed({ workspaceId, projectId }: Props) {
  const [open, setOpen] = useState(true);
  const { entries, isLoading } = useActivityFeed(workspaceId, projectId);

  return (
    <aside
      className={cn(
        "flex flex-col border-l border-gray-200 bg-white transition-all duration-200 dark:border-gray-700 dark:bg-gray-800",
        open ? "w-64" : "w-10"
      )}
    >
      {/* Header / toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-14 w-full items-center gap-2 border-b border-gray-200 px-3 text-gray-500 hover:text-gray-700 transition-colors dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
      >
        <Activity className="h-4 w-4 flex-shrink-0" />
        {open && (
          <span className="flex-1 text-left text-xs font-medium dark:text-white">Activity</span>
        )}
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 flex-shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Feed */}
      {open && (
        <div className="flex-1 overflow-y-auto scrollbar-hidden px-3 py-1">
          {isLoading ? (
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-2.5">
                  <Skeleton className="h-6 w-6 flex-shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2.5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="pt-4 text-center text-xs text-gray-400">
              No activity yet
            </p>
          ) : (
            entries.map((entry) => (
              <ActivityItem key={entry.id} entry={entry} />
            ))
          )}
        </div>
      )}
    </aside>
  );
}