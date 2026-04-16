import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { USER_ROLES } from "@/lib/roles";

// GET /api/csc/destructions?organization_id=xxx
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("organization_id");

    if (!orgId) {
        return jsonError("organization_id is required", 400);
    }

    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (auth instanceof Response) return auth;
    const { user, supabase } = auth;

    const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", orgId)
        .eq("user_id", user.id)
        .eq("membership_status", "active")
        .single();

    if (!membership) return jsonError("Forbidden", 403);

    const canView = [USER_ROLES.GRUENDER, USER_ROLES.ADMIN].includes(membership.role as any);
    if (!canView) return jsonError("Forbidden", 403);

    const { data: destructions, error } = await supabase
        .from("csc_destructions")
        .select(`
            id,
            organization_id,
            batch_id,
            amount_grams,
            destruction_reason,
            destroyed_by,
            destroyed_at,
            documentation_url,
            notes,
            created_at,
            csc_batches:batch_id (
                id,
                harvest_date,
                total_weight_grams,
                strains:strain_id (id, name, avg_thc, avg_cbd)
            )
        `)
        .eq("organization_id", orgId)
        .order("destroyed_at", { ascending: false });

    if (error) return jsonError("Failed to fetch destructions", 500, error.code, error.message);

    return jsonSuccess({ destructions });
}

// POST /api/csc/destructions
export async function POST(request: Request) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (auth instanceof Response) return auth;
    const { user, supabase } = auth;

    const body = await request.json();
    const { organization_id, batch_id, amount_grams, destruction_reason, documentation_url, notes } = body;

    if (!organization_id) {
        return jsonError("organization_id is required", 400);
    }
    if (!amount_grams || !destruction_reason) {
        return jsonError("amount_grams and destruction_reason are required", 400);
    }
    if (amount_grams <= 0) {
        return jsonError("amount_grams must be positive", 400);
    }

    // Membership check
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

    const { data: destruction, error } = await supabase
        .from("csc_destructions")
        .insert({
            organization_id,
            batch_id,
            amount_grams,
            destruction_reason,
            destroyed_by: user.id,
            documentation_url,
            notes,
        })
        .select(`
            id,
            batch_id,
            amount_grams,
            destruction_reason,
            destroyed_by,
            destroyed_at,
            documentation_url,
            notes,
            csc_batches:batch_id (
                id,
                harvest_date,
                strains:strain_id (id, name)
            )
        `)
        .single();

    if (error) return jsonError("Failed to record destruction", 500, error.code, error.message);

    return jsonSuccess({ destruction }, 201);
}
