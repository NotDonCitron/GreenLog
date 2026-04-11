import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { calculateUserPreferenceVector, extractStrainVector, cosineSimilarity } from "@/lib/algorithms/terpene-matching";

/**
 * GET /api/recommendations/match?strain_id=XXX
 *
 * Berechnet Match-Score fuer eine bestimmte Strain basierend auf
 * Kosinus-Aehnlichkeit (9-D Vektor aus Terpenen und Cannabinoiden).
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

  const userProfile = await calculateUserPreferenceVector(supabase, user.id);
  if (!userProfile) {
    return jsonSuccess({ score: null, basedOnRatings: 0 });
  }

  const { data: strain, error: strainError } = await supabase
    .from("strains")
    .select("id, name, slug, terpenes, thc_min, thc_max, cbd_min, cbd_max, cbg, cbn, thcv")
    .eq("id", strain_id)
    .single();

  if (strainError || !strain) {
    return jsonError("Strain not found", 404);
  }

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

  return jsonSuccess({ score: Math.round(score * 100), basedOnRatings: userProfile.ratingCount });
}
