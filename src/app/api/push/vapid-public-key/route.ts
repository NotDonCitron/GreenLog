import { jsonSuccess } from "@/lib/api-response";

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  return jsonSuccess({ publicKey });
}
