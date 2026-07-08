// Typed fetch wrapper, attaches Clerk Bearer token to every request.
// All hooks import from here; never call fetch directly in components.

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
 
// ── Base fetcher used by SWR ───────────────────────────────────────────────
// SWR's fetcher receives the URL as its argument.
// Call useApiFetcher() in a hook to get a fetcher bound to the current session.
 
export function useApiFetcher() {
  const { getToken } = useAuth();
 
  return useCallback(
    async (url: string) => {
      const token = await getToken();
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));

        if (res.status === 429) {
          const retryAfter = res.headers.get("Retry-After");
          throw new Error(
            `You're doing that too fast. Try again in ${retryAfter ?? "a moment"}.`
          );
        }

        throw new Error(err.error ?? `Request failed: ${res.status}`);
      }
      return res.json();
    },
    [getToken]
  );
}
 
// ── Mutation helper ────────────────────────────────────────────────────────
// Use this for POST / PATCH / DELETE calls in event handlers.
 
export function useApiMutation() {
  const { getToken } = useAuth();
 
  return useCallback(
    async <T = unknown>(
      url: string,
      method: "POST" | "PATCH" | "DELETE",
      body?: unknown
    ): Promise<T> => {
      const token = await getToken();
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));

        if (res.status === 429) {
          const retryAfter = res.headers.get("Retry-After");
          throw new Error(
            `You're doing that too fast. Try again in ${retryAfter ?? "a moment"}.`
          );
        }
        
        throw new Error(err.error ?? `${method} failed: ${res.status}`);
      }
      return res.json() as Promise<T>;
    },
    [getToken]
  );
}