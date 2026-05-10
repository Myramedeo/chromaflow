"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { useWorkspaceInvitations } from "@/hooks/useWorkspaceInvitations";
import type { WorkspaceInvitation, WorkspaceMember, WorkspaceRole } from "@/types";

function getInitials(name: string | null, email: string) {
  if (name) {
    const parts = name.split(" ").filter(Boolean);
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default function MembersSettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const {
    members,
    isLoading: membersLoading,
    currentUserRole,
    currentUserId,
    updateMemberRole,
    removeMember,
  } = useWorkspaceMembers(workspaceId);
  const {
    invitations,
    isLoading: invitesLoading,
    inviteMember,
    revokeInvitation,
    regenerateInvitationLink,
  } = useWorkspaceInvitations(workspaceId);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<WorkspaceRole, "OWNER">>("MEMBER");
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [roleLoadingId, setRoleLoadingId] = useState<string | null>(null);
  const [removeLoadingId, setRemoveLoadingId] = useState<string | null>(null);
  const [copyLoadingId, setCopyLoadingId] = useState<string | null>(null);

  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const canChangeRoles = currentUserRole === "OWNER";

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) => {
        if (a.role === b.role) return a.user.email.localeCompare(b.user.email);
        if (a.role === "OWNER") return -1;
        if (b.role === "OWNER") return 1;
        if (a.role === "ADMIN") return -1;
        if (b.role === "ADMIN") return 1;
        return 0;
      }),
    [members]
  );

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setSubmittingInvite(true);
    try {
      const result = await inviteMember({
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail("");
      setInviteRole("MEMBER");
      toast.success("Invitation created");
      try {
        await navigator.clipboard.writeText(result.inviteUrl);
        toast.success("Invite link copied to clipboard");
      } catch {
        toast.message("Invite link generated", { description: result.inviteUrl });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setSubmittingInvite(false);
    }
  }

  async function handleRoleChange(member: WorkspaceMember, role: WorkspaceRole) {
    if (!canChangeRoles || member.role === role) return;
    setRoleLoadingId(member.id);
    try {
      await updateMemberRole(member.id, role);
      toast.success("Member role updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setRoleLoadingId(null);
    }
  }

  async function handleRemove(member: WorkspaceMember) {
    setRemoveLoadingId(member.id);
    try {
      await removeMember(member.id);
      toast.success("Member removed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemoveLoadingId(null);
    }
  }

  async function handleRevoke(invitation: WorkspaceInvitation) {
    try {
      await revokeInvitation(invitation.id);
      toast.success("Invitation revoked");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke invitation");
    }
  }

  async function handleCopyInviteLink(invitation: WorkspaceInvitation) {
    setCopyLoadingId(invitation.id);
    try {
      const { inviteUrl } = await regenerateInvitationLink(invitation.id);
      try {
        await navigator.clipboard.writeText(inviteUrl);
        toast.success("Invite link copied to clipboard");
      } catch {
        toast.message("Invite link generated", { description: inviteUrl });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to copy invite link");
    } finally {
      setCopyLoadingId(null);
    }
  }

  if (membersLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Members</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage collaborators and pending invitations for this workspace.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-medium text-gray-800">Invite teammate</h2>
        <form onSubmit={handleInvite} className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="name@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={!canManage || submittingInvite}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select
              value={inviteRole}
              onValueChange={(value) => setInviteRole(value as "ADMIN" | "MEMBER")}
              disabled={!canManage || submittingInvite || currentUserRole !== "OWNER"}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={!canManage || submittingInvite || !inviteEmail.trim()}
            >
              {submittingInvite ? "Sending..." : "Send invite"}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-medium text-gray-800">Pending invitations</h2>
        {invitesLoading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : invitations.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No pending invitations.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                  <p className="text-xs text-gray-500">
                    {invitation.role} · Expires{" "}
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={copyLoadingId === invitation.id}
                      onClick={() => handleCopyInviteLink(invitation)}
                    >
                      {copyLoadingId === invitation.id ? "Copying..." : "Copy link"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevoke(invitation)}
                    >
                      Revoke
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-medium text-gray-800">Team members</h2>
        <div className="mt-4 space-y-2">
          {sortedMembers.map((member) => {
            const canRemoveThisMember =
              canManage &&
              member.userId !== currentUserId &&
              (currentUserRole === "OWNER" ||
                (currentUserRole === "ADMIN" && member.role === "MEMBER"));

            return (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(member.user.name, member.user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {member.user.name ?? member.user.email}
                    </p>
                    <p className="truncate text-xs text-gray-500">{member.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={member.role}
                    onValueChange={(value) =>
                      handleRoleChange(member, value as WorkspaceRole)
                    }
                    disabled={
                      !canChangeRoles ||
                      roleLoadingId === member.id ||
                      member.userId === currentUserId
                    }
                  >
                    <SelectTrigger className="h-8 w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWNER">Owner</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MEMBER">Member</SelectItem>
                    </SelectContent>
                  </Select>

                  {canRemoveThisMember && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={removeLoadingId === member.id}
                      onClick={() => handleRemove(member)}
                    >
                      {removeLoadingId === member.id ? "Removing..." : "Remove"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
