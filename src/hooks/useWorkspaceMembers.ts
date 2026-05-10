"use client";

import useSWR from "swr";
import { useApiFetcher, useApiMutation } from "@/lib/api-client";
import type { WorkspaceMember, WorkspaceRole } from "@/types";

interface WorkspaceMembersResponse {
  members: WorkspaceMember[];
  currentUserRole: WorkspaceRole;
  currentUserId: string;
}

export function useWorkspaceMembers(workspaceId: string | null) {
  const fetcher = useApiFetcher();
  const mutator = useApiMutation();
  const key = workspaceId ? `/api/workspaces/${workspaceId}/members` : null;
  const { data, error, isLoading, mutate } = useSWR<WorkspaceMembersResponse>(
    key,
    fetcher
  );

  async function updateMemberRole(memberId: string, role: WorkspaceRole) {
    if (!workspaceId) throw new Error("No workspaceId");
    const member = await mutator<WorkspaceMember>(
      `/api/workspaces/${workspaceId}/members/${memberId}`,
      "PATCH",
      { role }
    );
    await mutate();
    return member;
  }

  async function removeMember(memberId: string) {
    if (!workspaceId) throw new Error("No workspaceId");
    await mutator<{ removed: true }>(
      `/api/workspaces/${workspaceId}/members/${memberId}`,
      "DELETE"
    );
    await mutate();
  }

  return {
    members: data?.members ?? [],
    currentUserRole: data?.currentUserRole ?? null,
    currentUserId: data?.currentUserId ?? null,
    isLoading,
    error,
    updateMemberRole,
    removeMember,
    mutate,
  };
}
