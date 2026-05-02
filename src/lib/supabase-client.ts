// Browser-only Supabase client used exclusively for Realtime subscriptions.
// Prisma handles all DB queries, this client only opens the WebSocket channel.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton: prevents multiple WebSocket connections during React re-renders
const globalForSupabase = globalThis as unknown as {
  supabase: ReturnType<typeof createClient> | undefined;
};

export const supabase =
  globalForSupabase.supabase ??
  createClient(supabaseUrl, supabaseAnon, {
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  });

if (process.env.NODE_ENV !== "production") globalForSupabase.supabase = supabase;