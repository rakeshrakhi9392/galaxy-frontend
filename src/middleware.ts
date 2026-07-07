import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/workflows(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and the backend API proxy.
    // `/api/v1/*` is rewritten to the backend and authenticates via Bearer token;
    // running Clerk middleware on those requests can break body forwarding and
    // surface as browser "Failed to fetch" during workflow saves.
    "/((?!_next|api/v1|.*\\.(?:css|js|json|png|jpg|jpeg|gif|svg|ico|webp|map)$).*)",
  ],
};
