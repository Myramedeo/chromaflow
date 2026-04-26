import { auth, currentUser } from "@clerk/nextjs/server";
import { UserButton } from '@clerk/nextjs'
 
export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();
 
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <div className="absolute top-4 right-4">
        <UserButton afterSignOutUrl="/" />
      </div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-gray-500 text-sm">Auth is working ✓</p>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 font-mono space-y-1">
        <p><span className="text-gray-400">userId:</span> {userId}</p>
        <p><span className="text-gray-400">email:</span> {user?.emailAddresses[0]?.emailAddress}</p>
        <p><span className="text-gray-400">name:</span> {user?.firstName} {user?.lastName}</p>
      </div>
      <p className="text-xs text-gray-400 mt-4">
        Replace this page with a real dashboard later.
      </p>
    </main>
  );
}