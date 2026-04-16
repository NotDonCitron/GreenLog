import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { USER_ROLES } from "@/lib/roles";

// GET /api/csc/batches?organization_id=xxx
export async function GET(request: Request) {
    console.log("[csc/batches] START - URL:", request.url);
    try {
        const { searchParams } = new URL(request.url);
        const orgId = searchParams.get("organization_id");
        console.log("[csc/batches] OrgId from query:", orgId);

        if (!orgId) {
            return jsonError("organization_id is required", 400);
        }

        const auth = await authenticateRequest(request, getAuthenticatedClient);
        console.log("[csc/batches] Auth done, is Response:", auth instanceof Response);
        if (auth instanceof Response) return auth;
        const { user, supabase } = auth;

        console.log("[csc/batches] User ID:", user.id, "Org:", orgId);
        // Membership check
        const { data: membership, error: membershipError } = await supabase
            .from("organization_members")
            .select("role")
            .eq("organization_id", orgId)
            .eq("user_id", user.id)
            .eq("membership_status", "active")
            .single();

        console.log("[csc/batches] Membership result:", membership, "Error:", membershipError);

        const canView = [USER_ROLES.GRUENDER, USER_ROLES.ADMIN, USER_ROLES.MEMBER].includes(membership?.role as any);
        if (!canView) return jsonError("Forbidden", 403);

        // Fetch batches with strain info
        console.log("[csc/batches] Fetching for org:", orgId);
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
                strains:strain_id (id, name, slug, thc_min, thc_max, cbd_min, cbd_max)
            `)
            .eq("organization_id", orgId)
            .order("harvest_date", { ascending: false });

        if (error) {
            console.error("[csc/batches] Supabase error:", error);
            return jsonError("Failed to fetch batches", 500, error.code, error.message);
        }

        return jsonSuccess({ batches });
    } catch (err: unknown) {
        console.error("[csc/batches] Unexpected error:", err);
        const message = err instanceof Error ? err.message : "Internal server error";
        return jsonError(message, 500);
    }
}

// POST /api/csc/batches
export async function POST(request: Request) {
    console.log("[csc/batches] POST START");
    try {
        const auth = await authenticateRequest(request, getAuthenticatedClient);
        if (auth instanceof Response) return auth;
        const { user, supabase } = auth;

        const body = await request.json();
        const { organization_id, strain_id, harvest_date, total_weight_grams, plant_count, notes, quality_check_passed, quality_check_notes } = body;

        if (!organization_id) {
            return jsonError("organization_id is required", 400);
        }
        if (!strain_id || !harvest_date || !total_weight_grams || !plant_count) {
            return jsonError("strain_id, harvest_date, total_weight_grams, plant_count are required", 400);
        }
        if (total_weight_grams <= 0 || plant_count <= 0) {
            return jsonError("total_weight_grams and plant_count must be positive", 400);
        }

        // Membership + role check
        const { data: membership } = await supabase
            .from("organization_members")
            .select("role")
            .eq("organization_id", organization_id)
            .eq("user_id", user.id)
            .eq("membership_status", "active")
            .single();

        if (!membership) return jsonError("Forbidden", 403);

        const canManage = [USER_ROLES.GRUENDER, USER_ROLES.ADMIN].includes(membership.role as any);
        if (!canManage) return jsonError("Forbidden", 403);

        const { data: batch, error } = await supabase
            .from("csc_batches")
            .insert({
                organization_id,
                strain_id,
                harvest_date,
                total_weight_grams,
                plant_count,
                notes,
                recorded_by: user.id,
                quality_check_passed: quality_check_passed ?? null,
                quality_check_notes: quality_check_notes ?? null,
                quality_checked_at: quality_check_passed !== undefined ? new Date().toISOString() : null,
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
                strains:strain_id (id, name, slug, thc_min, thc_max, cbd_min, cbd_max)
            `)
            .single();

        if (error) return jsonError("Failed to create batch", 500, error.code, error.message);

        return jsonSuccess({ batch }, 201);
    } catch (err: unknown) {
        console.error("[csc/batches] POST Unexpected error:", err);
        const message = err instanceof Error ? err.message : "Internal server error";
        return jsonError(message, 500);
    }
}
