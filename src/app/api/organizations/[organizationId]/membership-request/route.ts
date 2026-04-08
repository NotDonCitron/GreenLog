import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { getSupabaseAdmin } from "@/lib/push";

type RouteParams = { params: Promise<{ organizationId: string }> };

// POST /api/organizations/[organizationId]/membership-request
export async function POST(request: Request, { params }: RouteParams) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return jsonError("Unauthorized", 401);
    if (auth instanceof Response) return auth;
    const { user, supabase } = auth;
    const { organizationId } = await params;
    
    // Fetch organization to check requires_member_approval flag
    const { data: organization, error: orgError } = await supabase
        .from("organizations")
        .select("id, requires_member_approval")
        .eq("id", organizationId)
        .single();

    if (orgError || !organization) {
        return jsonError("Organization not found", 404);
    }

    // Check if user already has a membership (active, pending, or invited)
    const { data: existingMembership, error: existingError } = await supabase
        .from("organization_members")
        .select("id, membership_status")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .single();

    if (existingError && existingError.code !== 'PGRST116') {
        return jsonError("Failed to check existing membership", 500, existingError.code, existingError.message);
    }

    if (existingMembership) {
        // User already has a membership
        if (existingMembership.membership_status === 'active') {
            return jsonError("You are already a member of this organization", 409);
        }
        if (existingMembership.membership_status === 'pending') {
            return jsonError("You already have a pending membership request", 400);
        }
        if (existingMembership.membership_status === 'invited') {
            return jsonError("You have a pending invitation. Accept it instead.", 400);
        }
        if (existingMembership.membership_status === 'removed') {
            return jsonError("Your membership was removed. Contact an admin to rejoin.", 400);
        }
    }

    // Determine membership status based on org's approval requirement
    const requiresApproval = organization.requires_member_approval === true;
    const membershipStatus = requiresApproval ? 'pending' : 'active';
    const joinedAt = requiresApproval ? null : new Date().toISOString();

    // Create membership record using adminClient to bypass RLS
    const adminClient = getSupabaseAdmin();
    const { data: membership, error: insertError } = await adminClient
        .from("organization_members")
        .insert({
            organization_id: organizationId,
            user_id: user.id,
            membership_status: membershipStatus,
            joined_at: joinedAt,
            role: 'member',
        })
        .select()
        .single();

    if (insertError) {
        return jsonError("Failed to create membership request", 500, insertError.code, insertError.message);
    }

    return jsonSuccess({
        membership,
        requires_approval: requiresApproval,
    }, 201);
}
