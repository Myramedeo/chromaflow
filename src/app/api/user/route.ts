// GET /api/user
// Upserts the Clerk user into our Postgres users table.
// Call this once after sign-in (e.g. from the dashboard Server Component).

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { ok, unauthorized } from "@/lib/api-helpers";

export async function GET() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return unauthorized();
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    return unauthorized();
  }

  // upsert — safe to call on every login
  const user = await db.user.upsert({
    where: { id: clerkUser.id },
    create: {
      id: clerkUser.id,
      email,
      name: [clerkUser.firstName, clerkUser.lastName]
        .filter(Boolean)
        .join(" ") || null,
      avatarUrl: clerkUser.imageUrl ?? null,
    },
    update: {
      email,
      name: [clerkUser.firstName, clerkUser.lastName]
        .filter(Boolean)
        .join(" ") || null,
      avatarUrl: clerkUser.imageUrl ?? null,
    },
  });

  return ok(user);
}