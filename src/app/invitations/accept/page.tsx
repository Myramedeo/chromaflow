import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import AcceptInvitationClient from "./AcceptInvitationClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col justify-center space-y-3 p-8">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      }
    >
      <AcceptInvitationClient />
    </Suspense>
  );
}
