import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { USER_ROLES } from "@/lib/roles";
import { writeOrganizationActivity } from "@/lib/organization-activities";

type RouteParams = { params: Promise<{ batchId: string }> };

// GET /api/csc/batches/[batchId]?organization_id=xxx
export async function GET(request: Request, { params }: RouteParams) {
    const { batchId } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organization_id");

    if (!organizationId) return jsonError("organization_id is required", 400);

    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (auth instanceof Response) return auth;
    const { user, supabase } = auth;

    const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .eq("membership_status", "active")
        .single();

    if (!membership) return jsonError("Forbidden", 403);

    const canView = [USER_ROLES.GRUENDER, USER_ROLES.ADMIN, USER_ROLES.MEMBER].includes(membership.role as any);
    if (!canView) return jsonError("Forbidden", 403);

    const { data: batch, error } = await supabase
        .from("csc_batches")
        .select(`
            id,
            organization_id,
            strain_id,
            harvest_date,
            total_weight_grams,
            plant_count,
            recorded_by,
            notes,
            quality_check_passed,
            quality_check_notes,
            quality_checked_at,
            created_at,
            updated_at,
            strains:strain_id (id, name, slug, thc_min, thc_max, cbd_min, cbd_max)
        `)
        .eq("id", batchId)
        .eq("organization_id", organizationId)
        .single();

    if (error) return jsonError("Batch not found", 404, error.code, error.message);
    if (!batch) return jsonError("Batch not found", 404);

    return jsonSuccess({ batch });
}

// PATCH /api/csc/batches/[batchId] — update quality check status
export async function PATCH(request: Request, { params }: RouteParams) {
    const { batchId } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organization_id");

    if (!organizationId) return jsonError("organization_id is required", 400);

    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (auth instanceof Response) return auth;
    const { user, supabase } = auth;

    const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .eq("membership_status", "active")
        .single();

    if (!membership) return jsonError("Forbidden", 403);

    const canManage = [USER_ROLES.GRUENDER, USER_ROLES.ADMIN].includes(membership.role as any);
    if (!canManage) return jsonError("Forbidden", 403);

    const body = await request.json();
    const { quality_check_passed, quality_check_notes } = body;

    const { data: batch, error } = await supabase
        .from("csc_batches")
        .update({
            quality_check_passed,
            quality_check_notes,
            quality_checked_at: new Date().toISOString(),
        })
        .eq("id", batchId)
        .eq("organization_id", organizationId)
        .select(`
            id,
            strain_id,
            harvest_date,
            total_weight_grams,
            plant_count,
            quality_check_passed,
            quality_check_notes,
            quality_checked_at,
            strains:strain_id (id, name, avg_thc, avg_cbd)
        `)
        .single();

    if (error) return jsonError("Failed to update batch", 500, error.code, error.message);

    // Log activity
    writeOrganizationActivity({
        supabase,
        organizationId,
        userId: user.id,
        eventType: "batch_quality_checked",
        targetType: "batch",
        target: { id: batch.id, name: `Ernte ${batch.harvest_date}` },
        metadata: { passed: quality_check_passed },
    }).catch(err => console.error("Activity write failed:", err));

    return jsonSuccess({ batch });
}