import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const shouldError = searchParams.get("error");

    if (shouldError) {
        throw new Error("Sentry Test Error - This is a deliberate error for testing");
    }

    return jsonSuccess({
        status: "ok",
        message: "Sentry is configured correctly",
        timestamp: new Date().toISOString(),
    });
}
