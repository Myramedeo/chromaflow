"use client";
import useSWR from "swr";
import { useApiFetcher, useApiMutation } from "@/lib/api-client";
import type { Workspace } from "@/types";
 
export function useWorkspaces() {
  const fetcher = useApiFetcher();
  const mutator = useApiMutation();
  const { data, error, isLoading, mutate } = useSWR<Workspace[]>(
    "/api/workspaces",
    fetcher
  );
 
  async function createWorkspace(name: string, slug: string) {
    const workspace = await mutator<Workspace>("/api/workspaces", "POST", { name, slug });
    await mutate();
    return workspace;
  }
 
  return {
    workspaces: data ?? [],
    isLoading,
    error,
    createWorkspace,
    mutate,
  };
}