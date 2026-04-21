import { jsonError, jsonSuccess, authenticateRequest } from "@/lib/api-response";
import { isAppAdmin } from "@/lib/auth";
import { getStrainPublicationSnapshot } from "@/lib/strains/publication";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { StrainPublicationStatus } from "@/lib/types";

const VALID_PUBLICATION_STATUSES: StrainPublicationStatus[] = [
  "draft",
  "review",
  "published",
  "rejected",
];

function isValidPublicationStatus(value: unknown): value is StrainPublicationStatus {
  return (
    typeof value === "string" &&
    VALID_PUBLICATION_STATUSES.includes(value as StrainPublicationStatus)
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof Response) return auth;
  const { user, supabase } = auth;

  if (!isAppAdmin(user.id)) {
    return jsonError("Forbidden", 403);
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const publicationStatus = body?.publication_status;
  const sourceNotes = body?.source_notes;

  if (!isValidPublicationStatus(publicationStatus)) {
    return jsonError(
      "publication_status must be one of: draft, review, published, rejected",
      400
    );
  }

  const { data: strain, error: loadError } = await supabase
    .from("strains")
    .select(
      "id, name, slug, type, description, thc_min, thc_max, cbd_min, cbd_max, terpenes, flavors, effects, image_url, canonical_image_path, primary_source"
    )
    .eq("id", id)
    .single();

  if (loadError || !strain) {
    return jsonError("Strain not found", 404);
  }

  const review = getStrainPublicationSnapshot(strain);
  if (publicationStatus === "published" && !review.canPublish) {
    return jsonError("Publish gate not satisfied", 400, "publish_gate_failed", {
      missing: review.missing,
    });
  }

  const { data: updated, error: updateError } = await supabase
    .from("strains")
    .update({
      publication_status: publicationStatus,
      source_notes: typeof sourceNotes === "string" && sourceNotes.trim() ? sourceNotes : null,
      quality_score: review.qualityScore,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, publication_status, quality_score, reviewed_by, reviewed_at")
    .single();

  if (updateError || !updated) {
    return jsonError("Failed to update publication status", 500, updateError?.code, updateError?.message);
  }

  return jsonSuccess({ strain: updated, review });
}
