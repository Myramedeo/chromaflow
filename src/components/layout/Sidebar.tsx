"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useProjects } from "@/hooks/useProjects";
import { CreateWorkspaceModal } from "./CreateWorkspaceModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { Users, CreditCard } from "lucide-react"

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { workspaces, isLoading: wsLoading } = useWorkspaces();

  // Derive active workspaceId from URL
  const activeWorkspaceId =
    pathname.match(/\/dashboard\/([^/]+)/)?.[1] ?? null;

  const { projects, isLoading: projLoading } = useProjects(activeWorkspaceId);

  return (
    <aside className="flex h-full w-60 flex-col border-r border-gray-200 bg-white">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4">
        <FolderKanban className="h-5 w-5 text-indigo-600" />
        <span className="text-sm font-semibold tracking-tight">Chromaflow</span>
      </div>

      {/* Workspaces */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        <section>
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-[11px] font-medium uppercase tracking-widest text-gray-400">
              Workspaces
            </span>
            <CreateWorkspaceModal>
              <div className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer">
                <Plus className="h-3.5 w-3.5" />
              </div>
            </CreateWorkspaceModal>
          </div>

          {wsLoading ? (
            <div className="space-y-1.5">
              {[1, 2].map((i) => <Skeleton key={i} className="h-8 w-full rounded-md" />)}
            </div>
          ) : workspaces.length === 0 ? (
            <p className="px-2 text-xs text-gray-400">No workspaces yet.</p>
          ) : (
            <nav className="space-y-0.5">
              {workspaces.map((ws) => (
                <Link
                  key={ws.id}
                  href={`/dashboard/${ws.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    activeWorkspaceId === ws.id
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-100 text-[10px] font-bold text-indigo-600 uppercase">
                    {ws.name[0]}
                  </span>
                  <span className="truncate">{ws.name}</span>
                </Link>
              ))}
            </nav>
          )}
        </section>

        {/* Projects under active workspace */}
        {activeWorkspaceId && (
          <section>
            <div className="mb-1 px-1">
              <span className="text-[11px] font-medium uppercase tracking-widest text-gray-400">
                Projects
              </span>
            </div>
            {projLoading ? (
              <div className="space-y-1.5">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-7 w-full rounded-md" />)}
              </div>
            ) : projects.length === 0 ? (
              <p className="px-2 text-xs text-gray-400">No projects yet.</p>
            ) : (
              <nav className="space-y-0.5">
                {projects.map((proj) => {
                  const href = `/dashboard/${activeWorkspaceId}/projects/${proj.id}`;
                  const isActive = pathname === href;
                  return (
                    <Link
                      key={proj.id}
                      href={href}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-gray-100 text-gray-900 font-medium"
                          : "text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: proj.color }}
                      />
                      <span className="truncate">{proj.name}</span>
                    </Link>
                  );
                })}
              </nav>
            )}
          </section>
        )}
      </div>

      {activeWorkspaceId && (
        <div className="px-3 pb-3">
          <Link
            href={`/dashboard/${activeWorkspaceId}/settings/members`}
            className={cn(
              "mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              pathname === `/dashboard/${activeWorkspaceId}/settings/members`
                ? "bg-gray-100 text-gray-900 font-medium"
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>Members</span>
          </Link>
          <Link
            href={`/dashboard/${activeWorkspaceId}/settings/billing`}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              pathname === `/dashboard/${activeWorkspaceId}/settings/billing`
                ? "bg-gray-100 text-gray-900 font-medium"
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <CreditCard className="h-4 w-4 flex-shrink-0" />
            <span>Billing</span>
          </Link>
        </div>
      )}

      {/* User footer */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback className="text-xs">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-xs font-medium text-gray-800">
              {user?.fullName}
            </p>
            <p className="truncate text-[11px] text-gray-400">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-gray-600"
            onClick={() => signOut({ redirectUrl: "/" })}
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}