import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import {
  calculateUserPreferenceVector,
  extractStrainVector,
  calculateMatchScore,
  sortMatchResults,
  MIN_RATINGS_FOR_PROFILE,
} from "@/lib/algorithms/terpene-matching";
import type { MatchResult } from "@/lib/types";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth || auth instanceof Response) return auth || jsonError("Unauthorized", 401);
  const { user, supabase } = auth;

  // Limit aus URL params (default 5, max 20)
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "5", 10), 20);

  // Hole alle bewerteten Strain-IDs um sie auszuschließen
  const { data: ratings } = await supabase
    .from("ratings")
    .select("strain_id")
    .eq("user_id", user.id);

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
  const userProfile = await calculateUserPreferenceVector(supabase, user.id);

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