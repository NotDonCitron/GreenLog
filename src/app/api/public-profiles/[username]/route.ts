import { jsonError, jsonSuccess } from "../../../../lib/api-response";
import { getPublicProfileByUsername } from "../../../../lib/public-profile";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{ username: string }>;
};

function getPublicProfileClient() {
  try {
    return getSupabaseAdmin();
  } catch (error) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw error;
    }

    return createClient(url, anonKey, {
      auth: { persistSession: false },
    });
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const { username } = await context.params;

  try {
    const profile = await getPublicProfileByUsername(getPublicProfileClient(), username);

    if (!profile) {
      return jsonError("Public profile not found", 404);
    }

    return jsonSuccess({ profile });
  } catch (error) {
    console.error("Public profile route error:", error);
    return jsonError("Failed to load public profile", 500);
  }
}
