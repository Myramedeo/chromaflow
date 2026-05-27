"use client";

import { useState } from "react";
import useSWR from "swr";
import { useApiFetcher } from "@/lib/api-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/hooks/useTasks";
import { useComments } from "@/hooks/useComments";
import { useSubtasks } from "@/hooks/useSubtasks";
import type { Task, TaskStatus, TaskPriority, WorkspaceMember } from "@/types";
import { PRIORITY_CONFIG, KANBAN_COLUMNS } from "@/types";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Trash2, CheckCircle2, Circle } from "lucide-react";
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
  const { comments, createComment } = useComments(workspaceId, projectId, task.id);
  const { subtasks, createSubtask, updateSubtask, deleteSubtask } = useSubtasks(workspaceId, projectId, task.id);
  const fetcher = useApiFetcher();
  const { data: workspace } = useSWR<{ members: WorkspaceMember[] }>(
    workspaceId ? `/api/workspaces/${workspaceId}` : null,
    fetcher
  );

  // Local state mirrors the task so fields feel instant
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [imageUrl, setImageUrl] = useState(task.imageUrl ?? "");
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? "");
  const [newComment, setNewComment] = useState("");
  const [newSubtask, setNewSubtask] = useState("");

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

  async function handleAssigneeChange(value: string | null) {
    if (value === null) return;
    const nextAssigneeId = value || null;
    const prevAssigneeId = assigneeId;

    if (nextAssigneeId === task.assigneeId) {
      setAssigneeId(value);
      return;
    }

    setAssigneeId(value);

    try {
      await updateTask(task.id, { assigneeId: nextAssigneeId });
      const member = workspace?.members.find((m) => m.user.id === value);
      toast.success(
        nextAssigneeId
          ? `Assigned to ${member?.user.name ?? "user"}`
          : "Task unassigned"
      );
    } catch {
      setAssigneeId(prevAssigneeId);
      toast.error("Failed to update assignee");
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

  async function handleImageUrlBlur() {
    const val = imageUrl.trim() || null;
    if (val === task.imageUrl) return;
    try {
      await updateTask(task.id, { imageUrl: val });
    } catch {
      toast.error("Failed to update image URL");
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

  async function handleAddComment() {
    if (!newComment.trim()) return;
    try {
      await createComment(newComment.trim());
      setNewComment("");
      toast.success("Comment added");
    } catch {
      toast.error("Failed to add comment");
    }
  }

  async function handleAddSubtask() {
    if (!newSubtask.trim()) return;
    try {
      await createSubtask(newSubtask.trim());
      setNewSubtask("");
      toast.success("Subtask added");
    } catch {
      toast.error("Failed to add subtask");
    }
  }

  async function handleToggleSubtask(subtaskId: string, completed: boolean) {
    try {
      await updateSubtask(subtaskId, { completed: !completed });
    } catch {
      toast.error("Failed to update subtask");
    }
  }

  async function handleDeleteSubtask(subtaskId: string) {
    if (!confirm("Delete this subtask?")) return;
    try {
      await deleteSubtask(subtaskId);
      toast.success("Subtask deleted");
    } catch {
      toast.error("Failed to delete subtask");
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => !v && onClose()}
    >
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-2 px-0">
          <SheetTitle className="sr-only">Task details</SheetTitle>
          {/* Inline editable title */}
          <textarea
            className={cn(
              "w-full resize-none rounded-md border-0 bg-transparent px-0",
              "text-xl font-semibold text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-500",
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
                  <SelectValue>
                    {KANBAN_COLUMNS.find((c) => c.id === task.status)?.label}
                  </SelectValue>
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
                  <SelectValue>
                    {PRIORITY_CONFIG[task.priority]?.label}
                  </SelectValue>
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

          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Assignee</Label>
            <Select value={assigneeId} onValueChange={handleAssigneeChange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue>
                  {workspace?.members.find((member) => member.user.id === task.assigneeId)?.user.name ??
                    task.assignee?.name ??
                    "Unassigned"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  <span className="text-gray-500">Unassigned</span>
                </SelectItem>
                {workspace?.members.map((member) => (
                  <SelectItem key={member.id} value={member.user.id}>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                      <span>{member.user.name ?? member.user.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Image URL</Label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onBlur={handleImageUrlBlur}
              placeholder="https://example.com/task-image.jpg"
            />
            {imageUrl && (
              <div className="overflow-hidden rounded-md border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Task image preview"
                  className="h-40 w-full object-cover"
                />
              </div>
            )}
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

          {/* Subtasks */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-500">Subtasks</Label>
                {subtasks.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {subtasks.filter((s) => s.completed).length} of {subtasks.length}
                  </span>
                )}
              </div>
              {subtasks.length > 0 && (
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${(subtasks.filter((s) => s.completed).length / subtasks.length) * 100}%` }}
                  />
                </div>
              )}
            </div>
            {subtasks.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => handleToggleSubtask(subtask.id, subtask.completed)}
                      className="flex-shrink-0 text-gray-400 hover:text-indigo-500 transition-colors"
                    >
                      {subtask.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </button>
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        subtask.completed ? "line-through text-gray-400" : "text-gray-700"
                      )}
                    >
                      {subtask.title}
                    </span>
                    <button
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a subtask…"
                className="flex-1 h-8 rounded-md border border-gray-200 px-3 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSubtask();
                }}
              />
              <Button
                size="sm"
                onClick={handleAddSubtask}
                disabled={!newSubtask.trim()}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-4">
            <Label className="text-xs text-gray-500">Comments</Label>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.author.avatarUrl || undefined} />
                    <AvatarFallback>
                      {comment.author.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {comment.author.name || "Anonymous"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a comment..."
                className="flex-1 h-8 rounded-md border border-gray-200 px-3 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddComment();
                }}
              />
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={!newComment.trim()}
              >
                Post
              </Button>
            </div>
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
            <div className="flex items-center justify-between">
              <span>Assigned to</span>
              <span className="font-medium text-gray-700">
                {task.assignee?.name ?? "Unassigned"}
              </span>
            </div>
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