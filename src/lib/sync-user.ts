import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { getE2eAuthUser, isE2eAuthBypassEnabled } from "@/lib/e2e-auth";

export async function syncUser(userId: string) {
  if (isE2eAuthBypassEnabled()) {
    const e2eUser = getE2eAuthUser();
    return db.user.upsert({
      where: { id: userId },
      update: {
        email: e2eUser.email,
        name: e2eUser.name,
        avatarUrl: null,
      },
      create: {
        id: userId,
        email: e2eUser.email,
        name: e2eUser.name,
        avatarUrl: null,
      },
    });
  }

  const clerkUser = await currentUser();

  if (!clerkUser) throw new Error("No Clerk user found");

  return db.user.upsert({
    where: { id: userId },
    update: {
      email: clerkUser.emailAddresses[0].emailAddress,
      name: clerkUser.fullName,
      avatarUrl: clerkUser.imageUrl,
    },
    create: {
      id: userId,
      email: clerkUser.emailAddresses[0].emailAddress,
      name: clerkUser.fullName,
      avatarUrl: clerkUser.imageUrl,
    },
  });
}