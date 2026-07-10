import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { isE2eAuthBypassEnabled } from "@/lib/e2e-auth";

const isPublicRoute = createRouteMatcher([
  "/",              // landing/marketing page
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isE2eAuthBypassEnabled()) {
    return;
  }

  if (!isPublicRoute(req) && !isApiRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};