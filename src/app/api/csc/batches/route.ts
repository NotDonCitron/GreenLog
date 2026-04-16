import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { USER_ROLES } from "@/lib/roles";

type RouteParams = { params: Promise<{ organizationId: string }> };

// GET /api/csc/batches?organization_id=xxx
export async function GET(request: Request, { params }: RouteParams) {
    const { organizationId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("organization_id") || organizationId;

    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (auth instanceof Response) return auth;
    const { user, supabase } = auth;

    // Membership check
    const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", orgId)
        .eq("user_id", user.id)
        .eq("membership_status", "active")
        .single();

    if (!membership) return jsonError("Forbidden", 403);

    const canView = [USER_ROLES.GRUENDER, USER_ROLES.ADMIN, USER_ROLES.MEMBER].includes(membership.role as any);
    if (!canView) return jsonError("Forbidden", 403);

    // Fetch batches with strain info
    const { data: batches, error } = await supabase
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
            strains:strain_id (id, name, slug, avg_thc, avg_cbd)
        `)
        .eq("organization_id", orgId)
        .order("harvest_date", { ascending: false });

    if (error) return jsonError("Failed to fetch batches", 500, error.code, error.message);

    return jsonSuccess({ batches });
}

// POST /api/csc/batches
export async function POST(request: Request, { params }: RouteParams) {
    const { organizationId } = await params;

    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (auth instanceof Response) return auth;
    const { user, supabase } = auth;

    // Membership + role check
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
    const { strain_id, harvest_date, total_weight_grams, plant_count, notes } = body;

    if (!strain_id || !harvest_date || !total_weight_grams || !plant_count) {
        return jsonError("strain_id, harvest_date, total_weight_grams, plant_count are required", 400);
    }

    if (total_weight_grams <= 0 || plant_count <= 0) {
        return jsonError("total_weight_grams and plant_count must be positive", 400);
    }

    const { data: batch, error } = await supabase
        .from("csc_batches")
        .insert({
            organization_id: organizationId,
            strain_id,
            harvest_date,
            total_weight_grams,
            plant_count,
            notes,
            recorded_by: user.id,
        })
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
            created_at,
            strains:strain_id (id, name, slug, avg_thc, avg_cbd)
        `)
        .single();

    if (error) return jsonError("Failed to create batch", 500, error.code, error.message);

    return jsonSuccess({ batch }, 201);
}