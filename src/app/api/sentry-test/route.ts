import { NextResponse } from "next/server";

// Test endpoint to verify Sentry is working
// You can trigger a test error by visiting /api/sentry-test?error=1

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shouldError = searchParams.get("error");

  if (shouldError) {
    // Intentionally throw an error to test Sentry
    throw new Error("Sentry Test Error - This is a deliberate error for testing");
  }

  return NextResponse.json({
    status: "ok",
    message: "Sentry is configured correctly",
    timestamp: new Date().toISOString(),
  });
}
