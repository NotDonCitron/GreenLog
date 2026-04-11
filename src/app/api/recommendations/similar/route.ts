import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { calculateUserPreferenceVector, extractStrainVector, cosineSimilarity } from "@/lib/algorithms/terpene-matching";

/**
 * GET /api/recommendations/similar?strain_id=XXX
 *
 * Berechnet chemische Ähnlichkeit zwischen User-Präferenzvektor
 * und allen Strains mittels Kosinus-Ähnlichkeit (9-D Vektor).
 * KCanG-konform: keine kollaborative Filterung.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const strain_id = searchParams.get("strain_id");

  if (!strain_id) {
    return jsonError("strain_id query parameter is required", 400);
  }

  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth) return;
  if (auth instanceof Response) return auth;

  const { user, supabase } = auth;

  // Build user preference vector from their ratings
  const userProfile = await calculateUserPreferenceVector(supabase, user.id);

  // If user has fewer than 3 ratings, return empty — section will be hidden
  if (!userProfile) {
    return jsonSuccess({ matches: [], ratingCount: 0 });
  }

  // Fetch the target strain
  const { data: targetStrain, error: strainError } = await supabase
    .from("strains")
    .select("id, name, slug, terpenes, thc_min, thc_max, cbd_min, cbd_max, cbg, cbn, thcv")
    .eq("id", strain_id)
    .single();

  if (strainError || !targetStrain) {
    return jsonError("Strain not found", 404);
  }

  // We don't use targetVector directly but the function call validates the extraction
  extractStrainVector(targetStrain);

  // Fetch all other strains with vector data
  const { data: allStrains, error: allStrainsError } = await supabase
    .from("strains")
    .select("id, name, slug, terpenes, thc_min, thc_max, cbd_min, cbd_max, cbg, cbn, thcv");

  if (allStrainsError) {
    console.error("[SimilarStrains] Error fetching strains:", allStrainsError);
    return jsonError("Failed to fetch strains", 500);
  }

  // Fetch user's rated strain IDs to exclude them from results
  const { data: userRatings } = await supabase
    .from("ratings")
    .select("strain_id")
    .eq("user_id", user.id);

  const excludeIds = new Set([
    ...(userRatings?.map(r => r.strain_id) || []),
    targetStrain.id, // exclude the current strain itself
  ]);

  // Compute similarity scores
  const scoredStrains = (allStrains || [])
    .filter(s => !excludeIds.has(s.id))
    .map(strain => {
      const strainVector = extractStrainVector(strain);
      const userVec = [
        userProfile.myrcen, userProfile.limonen, userProfile.caryophyllen, userProfile.pinen,
        userProfile.thc, userProfile.cbd, userProfile.cbg, userProfile.cbn, userProfile.thcv,
      ];
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
    .slice(0, 5);

  return jsonSuccess({ matches: scoredStrains, ratingCount: userProfile.ratingCount });
}
