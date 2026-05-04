// Shows the current plan, usage stats, and upgrade / manage billing buttons.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useApiMutation, useApiFetcher } from "@/lib/api-client";
import { PLAN_LIMITS } from "@/lib/plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Zap, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BillingInfo {
  plan: "FREE" | "PRO";
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  projectCount: number;
}

export default function BillingPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const fetcher  = useApiFetcher();
  const mutate   = useApiMutation();
  const [info, setInfo]       = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetcher(`/api/workspaces/${workspaceId}/billing`)
      .then(setInfo)
      .catch(() => toast.error("Failed to load billing info"))
      .finally(() => setLoading(false));
  }, [workspaceId, fetcher]);

  async function handleUpgrade() {
    setActionLoading(true);
    try {
      const { url } = await mutate<{ url: string }>(
        "/api/billing/checkout",
        "POST",
        { workspaceId }
      );
      window.location.href = url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleManage() {
    setActionLoading(true);
    try {
      const { url } = await mutate<{ url: string }>(
        "/api/billing/portal",
        "POST",
        { workspaceId }
      );
      window.location.href = url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to open billing portal");
    } finally {
      setActionLoading(false);
    }
  }

  const isPro      = info?.plan === "PRO";
  const limits     = PLAN_LIMITS[info?.plan ?? "FREE"];
  const projectPct = limits.projects === Infinity
    ? 0
    : Math.min(100, Math.round(((info?.projectCount ?? 0) / limits.projects) * 100));

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Billing</h1>

      {/* Current plan card */}
      <div className={cn(
        "mb-4 rounded-xl border p-6",
        isPro ? "border-indigo-200 bg-indigo-50" : "border-gray-200 bg-white"
      )}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isPro
                ? <Zap className="h-4 w-4 text-indigo-600" />
                : <CreditCard className="h-4 w-4 text-gray-400" />
              }
              <span className="text-sm font-medium text-gray-700">Current plan</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{limits.label}</p>
            <p className="mt-0.5 text-sm text-gray-500">{limits.priceLabel}</p>
          </div>

          <Badge
            className={cn(
              "text-xs",
              isPro ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"
            )}
          >
            {info?.status ?? "Active"}
          </Badge>
        </div>

        {/* Period end notice */}
        {info?.currentPeriodEnd && isPro && (
          <p className="mt-4 text-xs text-gray-500">
            {info.cancelAtPeriodEnd
              ? `Cancels on ${new Date(info.currentPeriodEnd).toLocaleDateString()}`
              : `Renews on ${new Date(info.currentPeriodEnd).toLocaleDateString()}`
            }
          </p>
        )}
      </div>

      {/* Usage card */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-medium text-gray-700">Usage</h2>
        <div className="space-y-4">
          {/* Projects usage bar */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-gray-600">Projects</span>
              <span className="text-gray-500">
                {info?.projectCount ?? 0}
                {limits.projects !== Infinity && ` / ${limits.projects}`}
                {limits.projects === Infinity && " (unlimited)"}
              </span>
            </div>
            {limits.projects !== Infinity && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    projectPct >= 100 ? "bg-red-400" : projectPct >= 80 ? "bg-amber-400" : "bg-indigo-500"
                  )}
                  style={{ width: `${projectPct}%` }}
                />
              </div>
            )}
          </div>

          {/* Team members limit */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Team members</span>
            <span className="text-gray-500">
              {limits.members === Infinity ? "Unlimited" : `Up to ${limits.members}`}
            </span>
          </div>
        </div>
      </div>

      {/* Pro features list */}
      {!isPro && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-medium text-gray-700">
            What you get with Pro
          </h2>
          <ul className="space-y-2">
            {[
              "Unlimited projects",
              "Unlimited team members",
              "Priority support",
              "Advanced analytics (coming soon)",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Past due warning */}
      {info?.status === "PAST_DUE" && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>Your last payment failed. Please update your payment method to keep Pro access.</span>
        </div>
      )}

      {/* CTA button */}
      {isPro ? (
        <Button
          onClick={handleManage}
          disabled={actionLoading}
          variant="outline"
          className="w-full"
        >
          {actionLoading ? "Opening…" : "Manage billing"}
        </Button>
      ) : (
        <Button
          onClick={handleUpgrade}
          disabled={actionLoading}
          className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
        >
          <Zap className="h-4 w-4" />
          {actionLoading ? "Redirecting to Stripe…" : "Upgrade to Pro — $12 / month"}
        </Button>
      )}
    </div>
  );
}