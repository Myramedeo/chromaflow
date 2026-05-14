"use client";
import useSWR from "swr";
import { useApiFetcher, useApiMutation } from "@/lib/api-client";
import type { Task, TaskStatus, TaskPriority } from "@/types";
 
export function useTasks(workspaceId: string, projectId: string) {
  const fetcher = useApiFetcher();
  const mutator = useApiMutation();
  const base = `/api/workspaces/${workspaceId}/projects/${projectId}`;
  const { data, error, isLoading, mutate } = useSWR<Task[]>(
    `${base}/tasks`,
    fetcher
  );
 
  async function createTask(payload: {
    title: string;
    status?: TaskStatus;
    assigneeId?: string | null;
  }) {
    const task = await mutator<Task>(`${base}/tasks`, "POST", payload);
    await mutate();
    return task;
  }
 
  async function updateTask(
    taskId: string,
    payload: Partial<{
      title: string;
      description: string | null;
      status: TaskStatus;
      priority: TaskPriority;
      position: number;
      dueDate: string | null;
      assigneeId: string | null;
    }>
  ) {
    const updated = await mutator<Task>(
      `${base}/tasks/${taskId}`,
      "PATCH",
      payload
    );
    // Update the cache without a full refetch for snappy UI
    await mutate(
      (current) =>
        current?.map((t) => (t.id === taskId ? { ...t, ...updated } : t)),
      { revalidate: false }
    );
    return updated;
  }
 
  async function deleteTask(taskId: string) {
    await mutator(`${base}/tasks/${taskId}`, "DELETE");
    await mutate((current) => current?.filter((t) => t.id !== taskId), {
      revalidate: false,
    });
  }
 
  return {
    tasks: data ?? [],
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    mutate,
  };
}