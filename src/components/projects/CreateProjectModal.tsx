"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjects } from "@/hooks/useProjects";
import { useApiMutation } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PLAN_LIMIT_ERROR } from "@/lib/plans";
import { Zap } from "lucide-react";

const COLOR_OPTIONS = [
  "#6366f1", "#8b5cf6", "#ec4899",
  "#f59e0b", "#22c55e", "#0ea5e9",
];

export function CreateProjectModal({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen]         = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const [name, setName]         = useState("");
  const [description, setDesc]  = useState("");
  const [color, setColor]       = useState(COLOR_OPTIONS[0]);
  const [loading, setLoading]   = useState(false);
  const { createProject }       = useProjects(workspaceId);
  const mutate                  = useApiMutation();
  const router                  = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const project = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
      toast.success(`Project "${project.name}" created`);
      setOpen(false);
      reset();
      router.push(`/dashboard/${workspaceId}/projects/${project.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("limit") || msg.includes(PLAN_LIMIT_ERROR)) {
        setLimitHit(true);
      } else {
        toast.error(msg || "Failed to create project");
      }
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setName(""); setDesc(""); setColor(COLOR_OPTIONS[0]); setLimitHit(false);
  }

  async function handleUpgrade() {
    setLoading(true);
    try {
      const { url } = await mutate<{ url: string }>(
        "/api/billing/checkout", "POST", { workspaceId }
      );
      window.location.href = url;
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{limitHit ? "Upgrade to Pro" : "New project"}</DialogTitle>
        </DialogHeader>

        {limitHit ? (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800">
              <p className="font-medium mb-1">You've hit the free plan limit</p>
              <p className="text-indigo-700">
                The free plan allows up to 3 projects. Upgrade to Pro for unlimited projects,
                team members, and more.
              </p>
            </div>
            <ul className="space-y-1.5 text-sm text-gray-600">
              {["Unlimited projects", "Unlimited team members", "Priority support"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> {f}
                </li>
              ))}
            </ul>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setLimitHit(false)} className="flex-1">Back</Button>
              <Button
                onClick={handleUpgrade}
                disabled={loading}
                className="flex-1 gap-1.5 bg-indigo-600 hover:bg-indigo-700"
              >
                <Zap className="h-4 w-4" />
                {loading ? "Redirecting…" : "Upgrade — $12/mo"}
              </Button>
            </div>
          </div>
        ) : (

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="proj-name">Name</Label>
              <Input
                id="proj-name"
                placeholder="Q4 Roadmap"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-desc">Description (optional)</Label>
              <Input
                id="proj-desc"
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
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !name.trim()}>
                {loading ? "Creating…" : "Create project"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}