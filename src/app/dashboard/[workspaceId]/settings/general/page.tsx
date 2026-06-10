"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useApiFetcher } from "@/lib/api-client";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { WorkspaceRole } from "@/types";

interface WorkspaceDetails {
  id: string;
  name: string;
  slug: string;
  members: { id: string }[];
  _count: { projects: number };
  currentUserRole: WorkspaceRole;
}

export default function GeneralSettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const fetcher = useApiFetcher();
  const { workspaces, deleteWorkspace } = useWorkspaces();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: workspace, isLoading } = useSWR<WorkspaceDetails>(
    workspaceId ? `/api/workspaces/${workspaceId}` : null,
    fetcher
  );

  const isOwner = workspace?.currentUserRole === "OWNER";
  const memberCount = workspace?.members.length ?? 0;
  const projectCount = workspace?._count.projects ?? 0;

  async function handleDeleteWorkspace() {
    if (!workspace) return;
    setDeleting(true);
    try {
      await deleteWorkspace(workspaceId, workspace.name);
      toast.success(`Workspace "${workspace.name}" deleted`);

      const remaining = workspaces.filter((w) => w.id !== workspaceId);
      if (remaining.length > 0) {
        router.push(`/dashboard/${remaining[0].id}`);
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete workspace");
      throw err;
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-8 pb-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">General</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Workspace details and settings
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : workspace ? (
        <div className="space-y-8">
          <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white">Workspace details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">Name</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{workspace.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">Slug</dt>
                <dd className="font-mono text-gray-900 dark:text-white">{workspace.slug}</dd>
              </div>
            </dl>
          </section>

          {isOwner && (
            <section className="rounded-xl border border-red-200 bg-red-50/50 p-6 dark:border-red-900/50 dark:bg-red-950/20">
              <h2 className="text-sm font-medium text-red-900 dark:text-red-200">Danger zone</h2>
              <p className="mt-2 text-sm text-red-800/80 dark:text-red-300/80">
                Deleting this workspace permanently removes {memberCount} member
                {memberCount !== 1 ? "s" : ""} and {projectCount} project
                {projectCount !== 1 ? "s" : ""}, including all tasks and activity. This cannot be undone.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="mt-4"
                onClick={() => setDeleteOpen(true)}
              >
                Delete workspace
              </Button>
            </section>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Workspace not found.</p>
      )}

      {workspace && (
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete workspace"
          description={`This will permanently delete "${workspace.name}" and all of its data. Type the workspace name below to confirm.`}
          confirmLabel="Delete workspace"
          requireTypedConfirmation={workspace.name}
          onConfirm={handleDeleteWorkspace}
          loading={deleting}
        />
      )}
    </div>
  );
}
