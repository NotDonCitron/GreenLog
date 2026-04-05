import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";

type RouteParams = { params: Promise<{ organizationId: string }> };

type StrainWithRelations = {
  strain_id: string;
  rating: number;
  strain: {
    id?: string;
    name?: string;
    slug?: string;
    image_url?: string;
    type?: string;
  } | null;
};

// GET /api/organizations/[organizationId]/analytics/strains
// Returns top strains by rating and collection count within an organization
export async function GET(request: Request, { params }: RouteParams) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof Response) return auth;

  const { user, supabase } = auth;
  const { organizationId } = await params;

  // Check membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("membership_status", "active")
    .single();

  if (!membership) {
    return jsonError("Forbidden", 403);
  }

  // Get all active member user_ids
  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("membership_status", "active");

  const memberIds = members?.map(m => m.user_id) || [];
  if (memberIds.length === 0) {
    return jsonSuccess({ strains: [], total_ratings: 0, total_favorites: 0 });
  }

  // Get strain stats from ratings and favorites for org members
  const { data: ratingsData } = await supabase
    .from("ratings")
    .select(`
      strain_id,
      rating,
      strain:strains(id, name, slug, image_url, type)
    `)
    .in("user_id", memberIds);

  // Get favorites/wishlist counts
  const { data: relationsData } = await supabase
    .from("user_strain_relations")
    .select("strain_id, relation_type")
    .in("user_id", memberIds)
    .in("relation_type", ["favorite", "wishlist", "collected"]);

  // Aggregate by strain
  const strainStats: Record<string, {
    strain_id: string;
    strain_name: string;
    strain_slug: string;
    strain_image: string | null;
    strain_type: string | null;
    avg_rating: number;
    rating_count: number;
    favorite_count: number;
    wishlist_count: number;
    collected_count: number;
  }> = {};

  // Process ratings
  for (const r of (ratingsData || []) as StrainWithRelations[]) {
    const sid = r.strain_id;
    if (!strainStats[sid]) {
      strainStats[sid] = {
        strain_id: sid,
        strain_name: r.strain?.name || "Unbekannt",
        strain_slug: r.strain?.slug || sid,
        strain_image: r.strain?.image_url || null,
        strain_type: r.strain?.type || null,
        avg_rating: 0,
        rating_count: 0,
        favorite_count: 0,
        wishlist_count: 0,
        collected_count: 0,
      };
    }
    strainStats[sid].avg_rating += r.rating;
    strainStats[sid].rating_count++;
  }

  // Calculate avg ratings
  for (const sid of Object.keys(strainStats)) {
    if (strainStats[sid].rating_count > 0) {
      strainStats[sid].avg_rating = Math.round(
        strainStats[sid].avg_rating / strainStats[sid].rating_count * 10
      ) / 10;
    }
  }

  // Process relations
  for (const rel of (relationsData || [])) {
    const sid = rel.strain_id as string;
    if (!strainStats[sid]) continue;
    if (rel.relation_type === "favorite") strainStats[sid].favorite_count++;
    if (rel.relation_type === "wishlist") strainStats[sid].wishlist_count++;
    if (rel.relation_type === "collected") strainStats[sid].collected_count++;
  }

  // Sort by rating_count (most rated first)
  const strains = Object.values(strainStats)
    .sort((a, b) => b.rating_count - a.rating_count)
    .slice(0, 20);

  const totalRatings = ratingsData?.length || 0;
  const totalFavorites = relationsData?.filter(r => r.relation_type === "favorite").length || 0;

  return jsonSuccess({
    strains,
    total_ratings: totalRatings,
    total_favorites: totalFavorites,
  });
}
