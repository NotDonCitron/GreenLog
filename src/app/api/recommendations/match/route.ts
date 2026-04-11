import { createServerSupabaseClient } from "@/lib/supabase/server";
import { jsonSuccess, jsonError, getBearerToken } from "@/lib/api-response";
import {
  calculateUserPreferenceVector,
  extractStrainVector,
  calculateMatchScore,
  MIN_RATINGS_FOR_PROFILE,
} from "@/lib/algorithms/terpene-matching";

/**
 * Extract user ID from Clerk JWT token (Bearer token)
 * Clerk's getToken({ template: 'supabase' }) returns a JWT where 'sub' is the user ID
 */
function getClerkUserIdFromToken(token: string): string | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return payload.sub || null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return jsonError("Unauthorized", 401);
  }

  const userId = getClerkUserIdFromToken(token);
  if (!userId) {
    return jsonError("Invalid token", 401);
  }

  const supabase = await createServerSupabaseClient();

  // Strain-ID aus URL params
  const url = new URL(request.url);
  const strainId = url.searchParams.get("strain_id");

  if (!strainId) {
    return jsonError("strain_id is required", 400, "MISSING_PARAM");
  }

  // Hole Strain-Daten
  const { data: strain, error: strainError } = await supabase
    .from("strains")
    .select(`
      id,
      name,
      slug,
      terpenes,
      thc_min,
      thc_max,
      cbd_min,
      cbd_max,
      cbg,
      cbn,
      thcv
    `)
    .eq("id", strainId)
    .single();

  if (strainError || !strain) {
    return jsonError("Strain not found", 404, "STRAIN_NOT_FOUND");
  }

  // Hole User-Präferenz-Vektor
  const userProfile = await calculateUserPreferenceVector(supabase, userId);

  if (!userProfile || userProfile.ratingCount < MIN_RATINGS_FOR_PROFILE) {
    return jsonSuccess({
      score: null,
      message: `Mindestens ${MIN_RATINGS_FOR_PROFILE} Bewertungen nötig`,
      basedOnRatings: userProfile?.ratingCount || 0,
    });
  }

  const strainVector = extractStrainVector(strain);
  const score = calculateMatchScore(userProfile, strainVector);

  return jsonSuccess({
    score,
    basedOnRatings: userProfile.ratingCount,
    strainId: strain.id,
    strainName: strain.name,
  });
}