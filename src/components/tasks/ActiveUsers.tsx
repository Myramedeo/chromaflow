// Renders overlapping avatar circles for users currently viewing the board.
// Driven by Supabase Presence with zero polling and updates in real time.

"use client";

import type { PresenceUser } from "@/hooks/useRealtimeTasks";
import { cn } from "@/lib/utils";

interface Props {
  users: PresenceUser[];
  max?: number;
}

const AVATAR_COLORS = [
  { bg: "bg-indigo-100", text: "text-indigo-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-amber-100",   text: "text-amber-700"   },
  { bg: "bg-pink-100",    text: "text-pink-700"     },
  { bg: "bg-sky-100",     text: "text-sky-700"      },
];

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ActiveUsers({ users, max = 5 }: Props) {
  if (users.length === 0) return null;

  const visible  = users.slice(0, max);
  const overflow = users.length - max;

  return (
    <div className="flex items-center gap-1.5">
      {/* Overlapping avatars */}
      <div className="flex -space-x-2">
        {visible.map((u, i) => {
          const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
          return (
            <div
              key={u.userId}
              title={u.name ?? "Unknown"}
              className={cn(
                "relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full",
                "ring-2 ring-white",
                !u.avatarUrl && color.bg
              )}
              style={{ zIndex: visible.length - i }}
            >
              {u.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={u.avatarUrl}
                  alt={u.name ?? "User"}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className={cn("text-[10px] font-semibold", color.text)}>
                  {getInitials(u.name)}
                </span>
              )}

              {/* Green "online" dot */}
              <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-white" />
            </div>
          );
        })}

        {/* Overflow badge */}
        {overflow > 0 && (
          <div
            className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 ring-2 ring-white"
            title={`${overflow} more`}
          >
            <span className="text-[10px] font-semibold text-gray-500">
              +{overflow}
            </span>
          </div>
        )}
      </div>

      <span className="text-xs text-gray-400">
        {users.length === 1 ? "1 viewer" : `${users.length} viewers`}
      </span>
    </div>
  );
}