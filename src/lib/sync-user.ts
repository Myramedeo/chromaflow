import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

export async function syncUser(userId: string) {
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