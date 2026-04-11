import { createServerSupabaseClient } from "@/lib/supabase/server";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import {
  calculateUserPreferenceVector,
  extractStrainVector,
  calculateMatchScore,
  MIN_RATINGS_FOR_PROFILE,
} from "@/lib/algorithms/terpene-matching";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

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
  const userProfile = await calculateUserPreferenceVector(supabase, user.id);

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