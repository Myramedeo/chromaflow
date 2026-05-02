"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/hooks/useTasks";
import type { Task, TaskStatus, TaskPriority } from "@/types";
import { PRIORITY_CONFIG, KANBAN_COLUMNS } from "@/types";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  task: Task;
  open: boolean;
  onClose: () => void;
}

export function TaskDetailModal({ task, open, onClose }: Props) {
  const { workspaceId, projectId } = useParams<{
    workspaceId: string;
    projectId: string;
  }>();

  const { updateTask, deleteTask } = useTasks(workspaceId, projectId);

  // Local state mirrors the task so fields feel instant
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");

  // Keep local state in sync if the task changes (e.g. via drag)
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
  }, [task]);

  async function handleTitleBlur() {
    if (title.trim() === task.title) return;
    try {
      await updateTask(task.id, { title: title.trim() });
    } catch {
      toast.error("Failed to update title");
      setTitle(task.title);
    }
  }

  async function handleDescriptionBlur() {
    const val = description.trim() || null;
    if (val === task.description) return;
    try {
      await updateTask(task.id, { description: val });
    } catch {
      toast.error("Failed to update description");
    }
  }

  async function handleStatusChange(status: TaskStatus | null) {
    if (status === null) return;

    try {
      await updateTask(task.id, { status });
      toast.success(`Moved to ${KANBAN_COLUMNS.find((c) => c.id === status)?.label}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handlePriorityChange(priority: TaskPriority | null) {
    if (priority === null) return;

    try {
      await updateTask(task.id, { priority });
    } catch {
      toast.error("Failed to update priority");
    }
  }

  async function handleDueDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const dueDate = e.target.value || null;
    try {
      await updateTask(task.id, { dueDate });
    } catch {
      toast.error("Failed to update due date");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    try {
      await deleteTask(task.id);
      onClose();
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6 px-0">
          <SheetTitle className="sr-only">Task details</SheetTitle>
          {/* Inline editable title */}
          <textarea
            className={cn(
              "w-full resize-none rounded-md border-0 bg-transparent px-0",
              "text-xl font-semibold text-gray-900 placeholder:text-gray-300",
              "focus:outline-none focus:ring-0 leading-snug"
            )}
            rows={2}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Task title"
          />
        </SheetHeader>

        <div className="space-y-6">
          {/* Status + Priority row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Status</Label>
              <Select value={task.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KANBAN_COLUMNS.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: col.color }}
                        />
                        {col.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Priority</Label>
              <Select value={task.priority} onValueChange={handlePriorityChange}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, { label: string; color: string }][]).map(
                    ([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: cfg.color }}
                          />
                          {cfg.label}
                        </div>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Due date</Label>
            <input
              type="date"
              className="h-8 w-full rounded-md border border-gray-200 px-3 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
              defaultValue={task.dueDate ? task.dueDate.substring(0, 10) : ""}
              onChange={handleDueDateChange}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Description</Label>
            <textarea
              className={cn(
                "min-h-[100px] w-full resize-y rounded-md border border-gray-200 px-3 py-2",
                "text-sm text-gray-700 placeholder:text-gray-300",
                "focus:border-indigo-400 focus:outline-none"
              )}
              placeholder="Add a description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
            />
          </div>

          {/* Meta */}
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <span>Created by</span>
              <span className="font-medium text-gray-700">{task.creator.name ?? "Unknown"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Created</span>
              <span className="font-medium text-gray-700">
                {new Date(task.createdAt).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </span>
            </div>
            {task.assignee && (
              <div className="flex items-center justify-between">
                <span>Assigned to</span>
                <span className="font-medium text-gray-700">{task.assignee.name}</span>
              </div>
            )}
          </div>

          {/* Delete */}
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-600 hover:bg-red-50 gap-1.5"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete task
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}