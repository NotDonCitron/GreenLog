import { createServerSupabaseClient } from "@/lib/supabase/server";
import { jsonSuccess, jsonError, getBearerToken } from "@/lib/api-response";
import {
  calculateUserPreferenceVector,
  extractStrainVector,
  calculateMatchScore,
  sortMatchResults,
  MIN_RATINGS_FOR_PROFILE,
} from "@/lib/algorithms/terpene-matching";
import type { MatchResult } from "@/lib/types";

/**
 * Extract user ID from Clerk JWT token (Bearer token)
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

  // Limit aus URL params (default 5, max 20)
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "5", 10), 20);

  // Hole alle bewerteten Strain-IDs um sie auszuschließen
  const { data: ratings } = await supabase
    .from("ratings")
    .select("strain_id")
    .eq("user_id", userId);

  const ratedStrainIds = new Set(ratings?.map(r => r.strain_id) || []);

  // Hole alle öffentlichen Strains (ohne die bereits bewerteten)
  const { data: allStrains, error: strainsError } = await supabase
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
    .limit(200); // Performance-Limit

  if (strainsError || !allStrains) {
    return jsonError("Failed to fetch strains", 500, "STRAINS_FETCH_ERROR");
  }

  // Hole User-Präferenz-Vektor
  const userProfile = await calculateUserPreferenceVector(supabase, userId);

  if (!userProfile || userProfile.ratingCount < MIN_RATINGS_FOR_PROFILE) {
    return jsonSuccess({
      matches: [],
      message: `Mindestens ${MIN_RATINGS_FOR_PROFILE} Bewertungen nötig für Profil-Übereinstimmung`,
      ratingCount: userProfile?.ratingCount || 0,
    });
  }

  // Berechne Match-Score für alle Strains
  const matchResults: MatchResult[] = [];

  for (const strain of allStrains) {
    // Überspringe bereits bewertete Sorten
    if (ratedStrainIds.has(strain.id)) continue;

    const strainVector = extractStrainVector(strain);
    const score = calculateMatchScore(userProfile, strainVector);

    matchResults.push({
      strainId: strain.id,
      strainName: strain.name,
      strainSlug: strain.slug,
      score,
      basedOnRatings: userProfile.ratingCount,
    });
  }

  // Sortiere und limitiere
  const topMatches = sortMatchResults(matchResults, limit);

  return jsonSuccess({
    matches: topMatches,
    ratingCount: userProfile.ratingCount,
  });
}