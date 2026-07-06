"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <p className="text-sm text-gray-500">Something went wrong.</p>
      <button onClick={reset} className="text-sm text-indigo-600 underline">
        Try again
      </button>
    </div>
  );
}