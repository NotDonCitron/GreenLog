import { jsonError, jsonSuccess, authenticateRequest } from "@/lib/api-response";
import { isAppAdmin } from "@/lib/auth";
import { getStrainPublicationSnapshot } from "@/lib/strains/publication";
import { getAuthenticatedClient } from "@/lib/supabase/client";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof Response) return auth;
  const { user, supabase } = auth;

  if (!isAppAdmin(user.id)) {
    return jsonError("Forbidden", 403);
  }

  const { data, error } = await supabase
    .from("strains")
    .select(
      "id, name, slug, type, description, thc_min, thc_max, cbd_min, cbd_max, terpenes, flavors, effects, image_url, canonical_image_path, primary_source, publication_status, quality_score"
    )
    .in("publication_status", ["draft", "review"])
    .order("quality_score", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    return jsonError("Failed to fetch review queue", 500, error.code, error.message);
  }

  const strains = (data ?? []).map((strain) => ({
    ...strain,
    review: getStrainPublicationSnapshot(strain),
  }));

  return jsonSuccess({ strains });
}
