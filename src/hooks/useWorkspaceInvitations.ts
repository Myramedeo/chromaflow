"use client";

import useSWR from "swr";
import { useApiFetcher, useApiMutation } from "@/lib/api-client";
import type { WorkspaceInvitation, WorkspaceRole } from "@/types";

interface CreateInvitationPayload {
  email: string;
  role: Exclude<WorkspaceRole, "OWNER">;
}

interface CreateInvitationResponse {
  invitation: WorkspaceInvitation;
  inviteUrl: string;
}

interface InvitationLinkResponse {
  inviteUrl: string;
}

export function useWorkspaceInvitations(workspaceId: string | null) {
  const fetcher = useApiFetcher();
  const mutator = useApiMutation();
  const key = workspaceId ? `/api/workspaces/${workspaceId}/invitations` : null;
  const { data, error, isLoading, mutate } = useSWR<WorkspaceInvitation[]>(
    key,
    fetcher
  );

  async function inviteMember(payload: CreateInvitationPayload) {
    if (!workspaceId) throw new Error("No workspaceId");
    const result = await mutator<CreateInvitationResponse>(
      `/api/workspaces/${workspaceId}/invitations`,
      "POST",
      payload
    );
    await mutate();
    return result;
  }

  async function revokeInvitation(invitationId: string) {
    if (!workspaceId) throw new Error("No workspaceId");
    await mutator<{ revoked: boolean }>(
      `/api/workspaces/${workspaceId}/invitations/${invitationId}`,
      "DELETE"
    );
    await mutate();
  }

  async function regenerateInvitationLink(invitationId: string) {
    if (!workspaceId) throw new Error("No workspaceId");
    const result = await mutator<InvitationLinkResponse>(
      `/api/workspaces/${workspaceId}/invitations/${invitationId}`,
      "POST"
    );
    await mutate();
    return result;
  }

  return {
    invitations: data ?? [],
    isLoading,
    error,
    inviteMember,
    revokeInvitation,
    regenerateInvitationLink,
    mutate,
  };
}
