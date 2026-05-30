"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjects } from "@/hooks/useProjects";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";
import { Pencil } from "lucide-react";

const COLOR_OPTIONS = [
  "#6366f1", "#8b5cf6", "#ec4899",
  "#f59e0b", "#22c55e", "#0ea5e9",
];

export function EditProjectModal({
  workspaceId,
  project,
  trigger,
}: {
  workspaceId: string;
  project: Project;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen]              = useState(false);
  const [name, setName]              = useState(project.name);
  const [description, setDesc]       = useState(project.description ?? "");
  const [color, setColor]            = useState(project.color);
  const [backgroundImageUrl, setBgImageUrl] = useState(project.backgroundImageUrl ?? "");
  const [loading, setLoading]        = useState(false);
  const { updateProject }            = useProjects(workspaceId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        backgroundImageUrl: backgroundImageUrl.trim() || undefined,
      });
      toast.success("Project updated");
      setOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(msg || "Failed to update project");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setName(project.name);
    setDesc(project.description ?? "");
    setColor(project.color);
    setBgImageUrl(project.backgroundImageUrl ?? "");
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) reset();
    }}>
      <DialogTrigger>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Pencil className="h-3.5 w-3.5 text-gray-900 dark:text-white" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-proj-name">Name</Label>
            <Input
              id="edit-proj-name"
              placeholder="Q4 Roadmap"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-proj-desc">Description (optional)</Label>
            <Input
              id="edit-proj-desc"
              placeholder="What is this project about?"
              value={description}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform",
                    color === c ? "border-gray-900 scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-bg-image">Background Image URL (optional)</Label>
            <Input
              id="edit-bg-image"
              placeholder="https://example.com/image.jpg"
              value={backgroundImageUrl}
              onChange={(e) => setBgImageUrl(e.target.value)}
            />
            {backgroundImageUrl && (
              <div className="text-xs text-gray-500">
                Preview: <span className="truncate">{backgroundImageUrl}</span>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => {
              setOpen(false);
              reset();
            }}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
