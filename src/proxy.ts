import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/feed(.*)",
  "/collection(.*)",
  "/profile(.*)",
  "/settings(.*)",
  "/community(.*)",
  "/strains(.*)",
  "/discover(.*)",
]);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default clerkMiddleware((auth, req: NextRequest) => {
  if (isProtectedRoute(req)) {
    auth.protect();
  }
  return NextResponse.next();
});
