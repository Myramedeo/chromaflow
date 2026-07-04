"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 text-center dark:bg-gray-950">
      <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-10 shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
          An unexpected error occurred while loading the application.
        </p>
        <pre className="mt-4 rounded-xl bg-gray-100 p-4 text-left text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {error.message}
        </pre>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
