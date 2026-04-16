import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { USER_ROLES } from "@/lib/roles";
import { writeOrganizationActivity } from "@/lib/organization-activities";

type RouteParams = { params: Promise<{ organizationId: string }> };

// GET /api/csc/dispensations?organization_id=xxx&member_id=xxx
export async function GET(request: Request, { params }: RouteParams) {
    const { organizationId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("organization_id") || organizationId;
    const memberId = searchParams.get("member_id");

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

    const canView = [USER_ROLES.GRUENDER, USER_ROLES.ADMIN, USER_ROLES.MEMBER, USER_ROLES.VIEWER].includes(membership.role as any);
    if (!canView) return jsonError("Forbidden", 403);

    let query = supabase
        .from("csc_dispensations")
        .select(`
            id,
            organization_id,
            member_id,
            batch_id,
            amount_grams,
            dispensed_at,
            dispensed_by,
            reason,
            created_at,
            csc_batches:batch_id (
                id,
                harvest_date,
                total_weight_grams,
                strain_id,
                strains:strain_id (id, name, avg_thc, avg_cbd)
            )
        `)
        .eq("organization_id", orgId)
        .order("dispensed_at", { ascending: false });

    if (memberId) {
        query = query.eq("member_id", memberId);
    }

    const { data: dispensations, error } = await query;
    if (error) return jsonError("Failed to fetch dispensations", 500, error.code, error.message);

    return jsonSuccess({ dispensations });
}

// POST /api/csc/dispensations — dispense cannabis to member
// NOTE: KCanG § 19 Abs. 3 hard block is enforced by DB trigger
export async function POST(request: Request, { params }: RouteParams) {
    const { organizationId } = await params;

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
    const { member_id, batch_id, amount_grams, reason } = body;

    if (!member_id || !batch_id || !amount_grams) {
        return jsonError("member_id, batch_id, and amount_grams are required", 400);
    }

    if (amount_grams <= 0) {
        return jsonError("amount_grams must be positive", 400);
    }

    // Insert — DB trigger fires and enforces KCanG § 19 Abs. 3 limits
    // If limit exceeded, trigger raises EXCEPTION and this returns 500
    const { data: dispensation, error } = await supabase
        .from("csc_dispensations")
        .insert({
            organization_id: organizationId,
            member_id,
            batch_id,
            amount_grams,
            dispensed_by: user.id,
            reason,
        })
        .select(`
            id,
            member_id,
            batch_id,
            amount_grams,
            dispensed_at,
            dispensed_by,
            reason,
            csc_batches:batch_id (
                id,
                harvest_date,
                strains:strain_id (id, name, avg_thc, avg_cbd)
            )
        `)
        .single();

    if (error) {
        // Check if it's a KCanG compliance error from the trigger
        const errorMsg = error.message || "";
        if (errorMsg.includes("KCanG Compliance Error") || errorMsg.includes("Limit")) {
            return jsonError(errorMsg, 400, "KCANG_LIMIT_EXCEEDED", errorMsg);
        }
        return jsonError("Failed to record dispensation", 500, error.code, error.message);
    }

    // Log activity
    writeOrganizationActivity({
        supabase,
        organizationId,
        userId: user.id,
        eventType: "cannabis_dispensed",
        targetType: "member",
        target: { id: member_id },
        metadata: { batch_id, amount_grams },
    }).catch(err => console.error("Activity write failed:", err));

    return jsonSuccess({ dispensation }, 201);
}