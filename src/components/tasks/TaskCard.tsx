"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskDetailModal } from "./TaskDetailModal";
import type { Task } from "@/types";
import { PRIORITY_CONFIG } from "@/types";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

interface Props {
  task: Task;
  isDragOverlay?: boolean;
}

export function TaskCard({ task, isDragOverlay = false }: Props) {
  const [detailOpen, setDetailOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = PRIORITY_CONFIG[task.priority];

  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => !isDragOverlay && setDetailOpen(true)}
        className={cn(
          "group cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm",
          "hover:border-indigo-200 hover:shadow-md transition-all",
          isDragging && "opacity-40 shadow-lg",
          isDragOverlay && "shadow-xl"
        )}
      >
        {/* Priority indicator */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: priority.color + "22",
              color: priority.color,
            }}
          >
            {priority.label}
          </span>
        </div>

        {/* Title */}
        <p className={cn(
          "text-sm font-medium text-gray-800 leading-snug",
          task.status === "DONE" && "line-through text-gray-400"
        )}>
          {task.title}
        </p>

        {/* Footer */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          {task.dueDate ? (
            <span className={cn(
              "flex items-center gap-1 text-[11px]",
              isOverdue ? "text-red-500" : "text-gray-400"
            )}>
              <CalendarDays className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          ) : (
            <span />
          )}

          {task.assignee && (
            <>
              {task.assignee.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={task.assignee.avatarUrl}
                  alt={task.assignee.name ?? "User"}
                  title={task.assignee.name ?? ""}
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[9px] font-bold text-indigo-600 uppercase"
                  title={task.assignee.name ?? ""}
                >
                  {task.assignee.name?.[0] ?? "?"}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {!isDragOverlay && (
        <TaskDetailModal
          key={task.id}
          task={task}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
        />
      )}
    </>
  );
}