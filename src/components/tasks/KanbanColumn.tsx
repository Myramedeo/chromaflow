"use client";

import { useState, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";
import type { KanbanColumn as KanbanColumnType, Task } from "@/types";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface Props {
  column: KanbanColumnType;
  tasks: Task[];
  onAddTask: (title: string) => Promise<void>;
}

export function KanbanColumn({ column, tasks, onAddTask }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Makes the column itself a drop target so cards can be dropped into empty columns
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title) { setIsAdding(false); return; }
    try {
      await onAddTask(title);
    } finally {
      setNewTitle("");
      setIsAdding(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") { setIsAdding(false); setNewTitle(""); }
  }

  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-xl bg-gray-50 border border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3">
        <span
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: column.color }}
        />
        <span className="text-sm font-medium text-gray-700">{column.label}</span>
        <span className="ml-auto rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-500">
          {tasks.length}
        </span>
      </div>

      {/* Task list — droppable ref goes here */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[60px] px-2 space-y-2 transition-colors",
          isOver && "bg-indigo-50/60 rounded-b-xl"
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
      </div>

      {/* Add task input */}
      <div className="p-2">
        {isAdding ? (
          <div className="rounded-lg border border-indigo-200 bg-white p-2 shadow-sm">
            <input
              ref={inputRef}
              autoFocus
              className="w-full text-sm outline-none placeholder:text-gray-400"
              placeholder="Task title…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleAdd}
            />
          </div>
        ) : (
          <button
            onClick={() => { setIsAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }}
            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add task
          </button>
        )}
      </div>
    </div>
  );
}