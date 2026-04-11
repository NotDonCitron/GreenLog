import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { calculateUserPreferenceVector, extractStrainVector, cosineSimilarity } from "@/lib/algorithms/terpene-matching";

/**
 * GET /api/recommendations/top?limit=5
 *
 * Gibt Top-Match Strains fuer den aktuellen User zurueck basierend auf
 * Kosinus-Aehnlichkeit (9-D Vektor aus Terpenen und Cannabinoiden).
 * KCanG-konform: keine kollaborative Filterung.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "5") || 5, 20);

  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth) return;
  if (auth instanceof Response) return auth;

  const { user, supabase } = auth;

  const userProfile = await calculateUserPreferenceVector(supabase, user.id);
  if (!userProfile) {
    return jsonSuccess({ matches: [], ratingCount: 0 });
  }

  // Get already-rated strain IDs to exclude
  const { data: userRatings } = await supabase
    .from("ratings")
    .select("strain_id")
    .eq("user_id", user.id);

  const excludeIds = new Set(userRatings?.map(r => r.strain_id) || []);

  const { data: allStrains, error: allStrainsError } = await supabase
    .from("strains")
    .select("id, name, slug, terpenes, thc_min, thc_max, cbd_min, cbd_max, cbg, cbn, thcv");

  if (allStrainsError) {
    console.error("[TopMatches] Error fetching strains:", allStrainsError);
    return jsonError("Failed to fetch strains", 500);
  }

  const userVec = [
    userProfile.myrcen, userProfile.limonen, userProfile.caryophyllen, userProfile.pinen,
    userProfile.thc, userProfile.cbd, userProfile.cbg, userProfile.cbn, userProfile.thcv,
  ];

  const scoredStrains = (allStrains || [])
    .filter(s => !excludeIds.has(s.id))
    .map(strain => {
      const strainVector = extractStrainVector(strain);
      const strainVec = [
        strainVector.myrcen, strainVector.limonen, strainVector.caryophyllen, strainVector.pinen,
        strainVector.thc, strainVector.cbd, strainVector.cbg, strainVector.cbn, strainVector.thcv,
      ];
      const score = cosineSimilarity(userVec, strainVec);
      return {
        strainId: strain.id,
        strainName: strain.name,
        strainSlug: strain.slug,
        score: Math.round(score * 100),
      };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return jsonSuccess({ matches: scoredStrains, ratingCount: userProfile.ratingCount });
}
