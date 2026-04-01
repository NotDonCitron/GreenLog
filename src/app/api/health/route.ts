import { jsonSuccess } from "@/lib/api-response";

export async function GET() {
    return jsonSuccess({
        status: 'ok',
        timestamp: Date.now(),
        timestampIso: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
    });
}
