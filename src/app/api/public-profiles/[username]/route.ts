import { jsonError, jsonSuccess } from "../../../../lib/api-response";
import { getPublicProfileByUsername } from "../../../../lib/public-profile";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";

type RouteContext = {
  params: Promise<{ username: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { username } = await context.params;

  try {
    const profile = await getPublicProfileByUsername(getSupabaseAdmin(), username);

    if (!profile) {
      return jsonError("Public profile not found", 404);
    }

    return jsonSuccess({ profile });
  } catch (error) {
    console.error("Public profile route error:", error);
    return jsonError("Failed to load public profile", 500);
  }
}
