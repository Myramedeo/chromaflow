// GET /api/cron/check-due-tasks
// Checks for tasks due soon and sends email reminders.
// Secured by CRON_SECRET env var.
//
// Usage with Vercel Cron:
//   Add to vercel.json:
//   {
//     "crons": [{
//       "path": "/api/cron/check-due-tasks",
//       "schedule": "0 9 * * *"
//     }]
//   }
//
// Or call manually:
//   curl -H "Authorization: Bearer <CRON_SECRET>" \
//     https://yourdomain.com/api/cron/check-due-tasks

import { NextRequest, NextResponse } from "next/server";
import { sendDueDateReminders } from "@/lib/notifications";

function getCronSecret() {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    throw new Error("CRON_SECRET is not configured");
  }
  return secret;
}

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const cronSecret = getCronSecret();
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const providedSecret = authHeader.slice(7); // Remove "Bearer " prefix
    if (providedSecret !== cronSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const sent = await sendDueDateReminders(3); // Check tasks due in next 3 days
    return NextResponse.json(
      {
        success: true,
        message: `Sent ${sent} due date reminder(s)`,
        count: sent,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[cron] check-due-tasks failed:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
