import { jsonError, jsonSuccess, authenticateRequest } from "@/lib/api-response";
import { isAppAdmin } from "@/lib/auth";
import { getStrainPublicationSnapshot } from "@/lib/strains/publication";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { StrainPublicationStatus } from "@/lib/types";

const VALID_BULK_STATUSES: StrainPublicationStatus[] = ["review", "published", "rejected"];

export async function PATCH(request: Request) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof Response) return auth;
  const { user, supabase } = auth;

  if (!isAppAdmin(user.id)) {
    return jsonError("Forbidden", 403);
  }

  const body = await request.json().catch(() => null);
  const ids: string[] = body?.ids ?? [];
  const targetStatus: string = body?.publication_status;

  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 500) {
    return jsonError("ids must be a non-empty array (max 500)", 400);
  }

  if (!VALID_BULK_STATUSES.includes(targetStatus as StrainPublicationStatus)) {
    return jsonError(`publication_status must be one of: ${VALID_BULK_STATUSES.join(", ")}`, 400);
  }

  const { data: strains, error: loadError } = await supabase
    .from("strains")
    .select("id, name, slug, type, description, thc_min, thc_max, cbd_min, cbd_max, terpenes, flavors, effects, image_url, canonical_image_path, primary_source")
    .in("id", ids);

  if (loadError || !strains) {
    return jsonError("Failed to load strains", 500);
  }

  const strainMap = new Map(strains.map((s) => [s.id, s]));
  const succeeded: string[] = [];
  const failed: Array<{ id: string; reason: string }> = [];

  for (const id of ids) {
    const strain = strainMap.get(id);
    if (!strain) {
      failed.push({ id, reason: "not found" });
      continue;
    }

    if (targetStatus === "published") {
      const review = getStrainPublicationSnapshot(strain);
      if (!review.canPublish) {
        failed.push({ id, reason: `publish gate: missing ${review.missing.join(", ")}` });
        continue;
      }
    }
    succeeded.push(id);
  }

  if (succeeded.length === 0) {
    return jsonError("No strains could be updated", 400, "bulk_empty", { failed });
  }

  const { error: updateError } = await supabase
    .from("strains")
    .update({
      publication_status: targetStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .in("id", succeeded);

  if (updateError) {
    return jsonError("Bulk update failed", 500, updateError.code, updateError.message);
  }

  return jsonSuccess({
    updated: succeeded.length,
    failed: failed.length,
    failures: failed,
  });
}
