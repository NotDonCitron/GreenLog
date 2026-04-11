import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";

/**
 * GET /api/recommendations/match?strain_id=XXX
 *
 * Berechnet Match-Score für eine bestimmte Strain basierend auf
 * kollaborativer Filterung.
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

  // Hole alle Ratings des aktuellen Users
  const { data: myRatings, error: myRatingsError } = await supabase
    .from("ratings")
    .select("strain_id, overall_rating")
    .eq("user_id", user.id);

  if (myRatingsError) {
    console.error("Error fetching my ratings:", myRatingsError);
    return jsonError("Failed to fetch ratings", 500);
  }

  if (!myRatings || myRatings.length === 0) {
    return jsonSuccess({ score: null, basedOnRatings: 0 });
  }

  // Finde die Strain-ID des angefragten Strains
  const { data: strain, error: strainError } = await supabase
    .from("strains")
    .select("id")
    .eq("id", strain_id)
    .single();

  if (strainError || !strain) {
    return jsonError("Strain not found", 404);
  }

  const targetStrainId = strain.id;

  // Prüfe ob User diese Strain bereits bewertet hat
  const alreadyRated = myRatings.some((r) => r.strain_id === targetStrainId);
  if (alreadyRated) {
    return jsonSuccess({ score: null, basedOnRatings: myRatings.length });
  }

  // Kollaborative Filterung
  const myStrainIds = new Set(myRatings.map((r) => r.strain_id));
  const myRatingsMap = new Map(myRatings.map((r) => [r.strain_id, r.overall_rating]));

  const { data: otherRatings, error: otherRatingsError } = await supabase
    .from("ratings")
    .select("user_id, strain_id, overall_rating")
    .neq("user_id", user.id)
    .in("strain_id", Array.from(myStrainIds));

  if (otherRatingsError) {
    console.error("Error fetching other ratings:", otherRatingsError);
    return jsonError("Failed to fetch ratings", 500);
  }

  if (!otherRatings || otherRatings.length === 0) {
    return jsonSuccess({ score: null, basedOnRatings: myRatings.length });
  }

  // Gruppiere Ratings nach User
  const otherUsersRatings = new Map<string, Map<string, number>>();
  for (const rating of otherRatings) {
    if (!otherUsersRatings.has(rating.user_id)) {
      otherUsersRatings.set(rating.user_id, new Map());
    }
    otherUsersRatings.get(rating.user_id)!.set(rating.strain_id, rating.overall_rating);
  }

  // Berechne Ähnlichkeit und Vorhersage
  let weightedSum = 0;
  let similaritySum = 0;

  for (const [, otherUserRatingsMap] of otherUsersRatings) {
    const targetRating = otherUserRatingsMap.get(targetStrainId);
    if (targetRating === undefined) continue;

    let similarity = 0;
    for (const [strainId, myRating] of myRatingsMap) {
      const otherRating = otherUserRatingsMap.get(strainId);
      if (otherRating !== undefined) {
        const diff = Math.abs(myRating - otherRating);
        similarity += 1 - diff / 4;
      }
    }

    if (similarity > 0) {
      weightedSum += similarity * targetRating;
      similaritySum += similarity;
    }
  }

  let score: number | null = null;
  if (similaritySum > 0) {
    score = Math.round((weightedSum / similaritySum / 5) * 100);
    score = Math.min(100, Math.max(0, score));
  }

  return jsonSuccess({ score, basedOnRatings: myRatings.length });
}
