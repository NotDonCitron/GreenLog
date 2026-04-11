import { createServerSupabaseClient } from "@/lib/supabase/server";
import { jsonSuccess, jsonError } from "@/lib/api-response";

/**
 * GET /api/recommendations/top?limit=5
 *
 * Gibt Top-Match Strains für den aktuellen User zurück basierend auf
 * kollaborativer Filterung.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "5") || 5, 20);

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Authentication required", 401);
  }

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
    return jsonSuccess({ matches: [], ratingCount: 0 });
  }

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
    return jsonSuccess({ matches: [], ratingCount: myRatings.length });
  }

  // Gruppiere Ratings nach User
  const otherUsersRatings = new Map<string, Map<string, number>>();
  for (const rating of otherRatings) {
    if (!otherUsersRatings.has(rating.user_id)) {
      otherUsersRatings.set(rating.user_id, new Map());
    }
    otherUsersRatings.get(rating.user_id)!.set(rating.strain_id, rating.overall_rating);
  }

  // Berechne predicted score für alle Strains
  const strainScores = new Map<string, { weightedSum: number; similaritySum: number }>();

  for (const [, otherUserRatingsMap] of otherUsersRatings) {
    for (const [strainId, otherRating] of otherUserRatingsMap) {
      if (myStrainIds.has(strainId)) continue;

      let similarity = 0;
      for (const [myStrainId, myRating] of myRatingsMap) {
        const otherRating2 = otherUserRatingsMap.get(myStrainId);
        if (otherRating2 !== undefined) {
          const diff = Math.abs(myRating - otherRating2);
          similarity += 1 - diff / 4;
        }
      }

      if (similarity > 0) {
        if (!strainScores.has(strainId)) {
          strainScores.set(strainId, { weightedSum: 0, similaritySum: 0 });
        }
        const entry = strainScores.get(strainId)!;
        entry.weightedSum += similarity * otherRating;
        entry.similaritySum += similarity;
      }
    }
  }

  // Konvertiere zu Scores und sortiere
  const scoredStrains: { strainId: string; score: number }[] = [];
  for (const [strainId, { weightedSum, similaritySum }] of strainScores) {
    if (similaritySum > 0) {
      const score = Math.round((weightedSum / similaritySum / 5) * 100);
      scoredStrains.push({ strainId, score: Math.min(100, Math.max(0, score)) });
    }
  }

  scoredStrains.sort((a, b) => b.score - a.score);
  const topStrainIds = scoredStrains.slice(0, limit).map((s) => s.strainId);

  if (topStrainIds.length === 0) {
    return jsonSuccess({ matches: [], ratingCount: myRatings.length });
  }

  const { data: strains, error: strainsError } = await supabase
    .from("strains")
    .select("id, name, slug")
    .in("id", topStrainIds);

  if (strainsError) {
    console.error("Error fetching strains:", strainsError);
    return jsonError("Failed to fetch strains", 500);
  }

  const scoreMap = new Map(scoredStrains.map((s) => [s.strainId, s.score]));
  const matches = (strains || [])
    .map((strain) => ({
      strainId: strain.id,
      strainName: strain.name,
      strainSlug: strain.slug,
      score: scoreMap.get(strain.id) || 0,
      basedOnRatings: myRatings.length,
    }))
    .sort((a, b) => b.score - a.score);

  return jsonSuccess({ matches, ratingCount: myRatings.length });
}
