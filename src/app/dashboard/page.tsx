// Redirects to the user's first workspace, or shows an empty state.

"use client";

import { useWorkspaces } from "../../hooks/useWorkspaces";
import { CreateWorkspaceModal } from "../../components/layout/CreateWorkspaceModal";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderKanban } from "lucide-react";

export default function DashboardPage() {
  const { workspaces, isLoading } = useWorkspaces();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && workspaces.length > 0) {
      router.replace(`/dashboard/${workspaces[0].id}`);
    }
  }, [isLoading, workspaces, router]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (workspaces.length > 0) return null;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
        <FolderKanban className="h-7 w-7 text-indigo-600" />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Welcome to Chromaflow</h1>
        <p className="mt-1 text-sm text-gray-500">Create your first workspace to get started.</p>
      </div>
      <CreateWorkspaceModal>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" />
          Create workspace
        </Button>
      </CreateWorkspaceModal>
    </div>
  );
}