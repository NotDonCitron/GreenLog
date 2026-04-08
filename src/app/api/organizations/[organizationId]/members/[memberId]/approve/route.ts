import { getAuthenticatedClient } from "@/lib/supabase/client";
import { writeOrganizationActivity } from "@/lib/organization-activities";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { USER_ROLES } from "@/lib/roles";

type RouteParams = { params: Promise<{ organizationId: string; memberId: string }> };

// PATCH /api/organizations/[organizationId]/members/[memberId]/approve
export async function PATCH(request: Request, { params }: RouteParams) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return jsonError("Unauthorized", 401);
    if (auth instanceof Response) return auth;
    const { user, supabase } = auth;
    const { organizationId, memberId } = await params;

    // Check if current user is admin or gründer
    const { data: currentMember, error: membershipError } = await supabase
        .from("organization_members")
        .select("role, membership_status")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .eq("membership_status", "active")
        .single();

    if (membershipError || !currentMember) {
        return jsonError("Forbidden", 403);
    }

    const isOwner = currentMember.role === USER_ROLES.GRUENDER;
    const isAdmin = currentMember.role === USER_ROLES.ADMIN;

    if (!isOwner && !isAdmin) {
        return jsonError("Forbidden", 403);
    }

    // Fetch target membership - must be pending
    const { data: targetMember, error: targetError } = await supabase
        .from("organization_members")
        .select("id, user_id, membership_status, role")
        .eq("id", memberId)
        .eq("organization_id", organizationId)
        .single();

    if (targetError || !targetMember) {
        return jsonError("Member not found", 404);
    }

    if (targetMember.membership_status !== 'pending') {
        return jsonError("Cannot approve a member that is not pending", 400);
    }

    // Update membership status to active and set joined_at
    const { data: updated, error: updateError } = await supabase
        .from("organization_members")
        .update({
            membership_status: 'active',
            joined_at: new Date().toISOString(),
        })
        .eq("id", memberId)
        .eq("organization_id", organizationId)
        .select()
        .single();

    if (updateError) {
        return jsonError("Failed to approve member", 500, updateError.code, updateError.message);
    }

    // Write activity
    await writeOrganizationActivity({
        supabase,
        organizationId,
        userId: user.id,
        eventType: 'member_joined',
        targetType: 'member',
        target: { id: memberId, name: targetMember.user_id },
        metadata: { approvedRole: targetMember.role },
    }).catch(err => console.error('Activity write failed:', err));

    return jsonSuccess({ member: updated });
}
