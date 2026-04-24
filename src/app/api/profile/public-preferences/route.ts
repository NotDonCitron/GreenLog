import { authenticateRequest, jsonError, jsonSuccess } from "@/lib/api-response";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { withDefaultPublicPreferences } from "@/lib/public-profile";
import type { PublicProfilePreferences } from "@/lib/types";

const BOOLEAN_KEYS = [
  "show_badges",
  "show_favorites",
  "show_tried_strains",
  "show_reviews",
  "show_activity_feed",
  "show_follow_counts",
  "default_review_public",
] as const satisfies readonly (keyof PublicProfilePreferences)[];

type PreferenceKey = (typeof BOOLEAN_KEYS)[number];

function sanitizePreferencePatch(body: unknown): Partial<Record<PreferenceKey, boolean>> | null {
  if (!body || typeof body !== "object") return null;

  const patch: Partial<Record<PreferenceKey, boolean>> = {};
  for (const key of BOOLEAN_KEYS) {
    const value = (body as Record<string, unknown>)[key];
    if (value !== undefined) {
      if (typeof value !== "boolean") return null;
      patch[key] = value;
    }
  }

  return Object.keys(patch).length ? patch : null;
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth || auth instanceof Response) return auth || jsonError("Unauthorized", 401);
  const { user, supabase } = auth;

  const { data, error } = await supabase
    .from("user_public_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return jsonError(`Failed to load public preferences: ${error.message}`, 500);
  }

  return jsonSuccess(withDefaultPublicPreferences(user.id, data));
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth || auth instanceof Response) return auth || jsonError("Unauthorized", 401);
  const { user, supabase } = auth;

  const patch = sanitizePreferencePatch(await request.json().catch(() => null));
  if (!patch) {
    return jsonError("At least one boolean public preference is required", 400);
  }

  const nextPreferences = {
    user_id: user.id,
    ...patch,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("user_public_preferences")
    .upsert(nextPreferences, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    return jsonError(`Failed to save public preferences: ${error.message}`, 500);
  }

  return jsonSuccess(withDefaultPublicPreferences(user.id, data));
}
