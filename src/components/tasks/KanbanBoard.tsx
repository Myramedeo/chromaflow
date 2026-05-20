"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { arrayMove } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { useRealtimeTasks, type PresenceUser } from "@/hooks/useRealtimeTasks";
import { KANBAN_COLUMNS, type Task, type TaskStatus } from "@/types";
import { toast } from "sonner";

interface Props {
  workspaceId: string;
  projectId: string;
  onActiveUsersChange?: (users: PresenceUser[]) => void;
}

export function KanbanBoard({ workspaceId, projectId, onActiveUsersChange }: Props) {
  const { tasks, isLoading, createTask, updateTask, activeUsers } = useRealtimeTasks(workspaceId, projectId);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Bubble presence list up to the page so the header can render <ActiveUsers />
  useEffect(() => {
    onActiveUsersChange?.(activeUsers);
  }, [activeUsers, onActiveUsersChange]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const tasksByStatus = useCallback(
    (status: TaskStatus) =>
      tasks
        .filter((t) => t.status === status)
        .sort((a, b) => a.position - b.position),
    [tasks]
  );

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const quickAddInputRef = useRef<HTMLInputElement>(null);
  const firstColumn = KANBAN_COLUMNS[0];

  useKeyboardShortcut(
    { key: "n", mod: "ctrlOrMeta" },
    () => setQuickAddOpen(true)
  );

  useKeyboardShortcut(
    { key: "Escape" },
    () => quickAddOpen && setQuickAddOpen(false),
    quickAddOpen
  );

  useEffect(() => {
    if (!quickAddOpen) return;
    quickAddInputRef.current?.focus();
  }, [quickAddOpen]);

  async function handleQuickAddSubmit() {
    const title = quickAddTitle.trim();
    if (!title || !firstColumn) return;

    setIsQuickAdding(true);
    try {
      await createTask({ title, status: firstColumn.id });
      setQuickAddTitle("");
      setQuickAddOpen(false);
      toast.success("Task created");
    } catch {
      toast.error("Failed to create task");
    } finally {
      setIsQuickAdding(false);
    }
  }

  function handleQuickAddKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleQuickAddSubmit();
    }
    if (e.key === "Escape") {
      setQuickAddOpen(false);
    }
  }

  function handleDragStart({ active }: DragStartEvent) {
    const task = tasks.find((t) => t.id === active.id);
    if (task) setActiveTask(task);
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null);
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // Determine the target column — over.id is either a taskId or a columnId
    const overTask = tasks.find((t) => t.id === over.id);
    const targetStatus: TaskStatus = overTask
      ? overTask.status
      : (over.id as TaskStatus);

    if (!KANBAN_COLUMNS.find((c) => c.id === targetStatus)) return;

    const sameColumn = activeTask.status === targetStatus;
    const columnTasks = tasksByStatus(targetStatus);

    let newPosition: number;

    if (!sameColumn) {
      // Moving to a different column — append to end
      newPosition =
        columnTasks.length > 0
          ? columnTasks[columnTasks.length - 1].position + 1000
          : 1000;
    } else if (overTask) {
      // Reordering within column — midpoint between neighbours
      const oldIndex = columnTasks.findIndex((t) => t.id === active.id);
      const newIndex = columnTasks.findIndex((t) => t.id === over.id);
      const reordered = arrayMove(columnTasks, oldIndex, newIndex);
      const idx = reordered.findIndex((t) => t.id === active.id);
      const prev = reordered[idx - 1];
      const next = reordered[idx + 1];
      if (prev && next) newPosition = (prev.position + next.position) / 2;
      else if (prev) newPosition = prev.position + 1000;
      else if (next) newPosition = next.position / 2;
      else newPosition = 1000;
    } else {
      return; // dropped onto column header with no change
    }

    try {
      await updateTask(activeTask.id, {
        status: targetStatus,
        position: newPosition,
      });
      if (!sameColumn) {
        toast.success(`Moved to ${KANBAN_COLUMNS.find((c) => c.id === targetStatus)?.label}`);
      }
    } catch {
      toast.error("Failed to move task");
    }
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 p-6">
        {KANBAN_COLUMNS.map((col) => (
          <div
            key={col.id}
            className="h-96 w-72 flex-shrink-0 animate-pulse rounded-xl bg-gray-100"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {quickAddOpen && (
        <div className="fixed inset-x-0 top-20 z-50 flex justify-center px-4">
          <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-4 shadow-xl ring-1 ring-black/5">
            <div className="flex items-center justify-between gap-3 pb-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Quick add task</p>
                <p className="text-xs text-gray-500">Create a new task in the first column.</p>
              </div>
              <button
                type="button"
                className="rounded-md px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
                onClick={() => setQuickAddOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <input
                ref={quickAddInputRef}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="New task title…"
                value={quickAddTitle}
                onChange={(e) => setQuickAddTitle(e.target.value)}
                onKeyDown={handleQuickAddKeyDown}
                aria-label="Quick add task title"
              />
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                  onClick={handleQuickAddSubmit}
                  disabled={!quickAddTitle.trim() || isQuickAdding}
                >
                  {isQuickAdding ? "Creating…" : "Create task"}
                </button>
                <span className="text-xs text-gray-500">Shortcut: Ctrl/Cmd+N</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto p-6 pb-8">
          {KANBAN_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={tasksByStatus(col.id)}
              onAddTask={(title) =>
                createTask({ title, status: col.id }).then(() => {})
              }
            />
          ))}
        </div>

        {/* Ghost card shown while dragging */}
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-2 opacity-90">
              <TaskCard task={activeTask} isDragOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}