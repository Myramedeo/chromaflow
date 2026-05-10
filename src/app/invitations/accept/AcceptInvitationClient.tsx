"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useApiMutation } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface AcceptedWorkspace {
  id: string;
  name: string;
  slug: string;
}

export default function AcceptInvitationClient() {
  const searchParams = useSearchParams();
  const mutate = useApiMutation();
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<AcceptedWorkspace | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasRequested = useRef(false);

  const workspaceId = searchParams.get("workspaceId");
  const token = searchParams.get("token");
  const isInvalidLink = !workspaceId || !token;

  useEffect(() => {
    if (hasRequested.current) return;
    if (isInvalidLink) return;

    hasRequested.current = true;

    mutate<{ accepted: boolean; workspace: AcceptedWorkspace }>(
      `/api/workspaces/${workspaceId}/invitations/accept`,
      "POST",
      { token }
    )
      .then((result) => {
        setWorkspace(result.workspace);
        toast.success("Invitation accepted");
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to accept invitation";

        setErrorMessage(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, [isInvalidLink, mutate, token, workspaceId]);

  if (isInvalidLink) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center p-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h1 className="text-xl font-semibold text-gray-900">
            Invitation failed
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Invalid invitation link.
          </p>

          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) return null;

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center p-8">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {workspace ? (
          <>
            <h1 className="text-xl font-semibold text-gray-900">
              You are in
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              You now have access to{" "}
              <span className="font-medium">{workspace.name}</span>.
            </p>

            <Button asChild className="mt-4 w-full">
              <Link href={`/dashboard/${workspace.id}`}>
                Open workspace
              </Link>
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-gray-900">
              Invitation failed
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              {errorMessage ??
                "This invitation link is invalid or expired."}
            </p>

            <Button asChild variant="outline" className="mt-4 w-full">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}