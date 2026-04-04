import { jsonError } from "@/lib/api-response";

export async function GET() {
    return jsonError("Endpoint removed for security", 410);
}
