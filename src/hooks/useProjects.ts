"use client";
import useSWR from "swr";
import { useApiFetcher, useApiMutation } from "@/lib/api-client";
import type { Project } from "@/types";

export function useProjects(workspaceId: string | null) {
  const fetcher = useApiFetcher();
  const mutator = useApiMutation();
  const key = workspaceId ? `/api/workspaces/${workspaceId}/projects` : null;
  const { data, error, isLoading, mutate } = useSWR<Project[]>(key, fetcher);

  async function createProject(payload: {
    name: string;
    description?: string;
    color?: string;
  }) {
    if (!workspaceId) throw new Error("No workspaceId");
    const project = await mutator<Project>(
      `/api/workspaces/${workspaceId}/projects`,
      "POST",
      payload
    );
    await mutate();
    return project;
  }

  return {
    projects: data ?? [],
    isLoading,
    error,
    createProject,
    mutate,
  };
}