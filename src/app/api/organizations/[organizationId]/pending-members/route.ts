import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { USER_ROLES } from "@/lib/roles";

type RouteParams = { params: Promise<{ organizationId: string }> };

// GET /api/organizations/[organizationId]/pending-members
export async function GET(request: Request, { params }: RouteParams) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return;
    if (auth instanceof Response) return;
    const { user, supabase } = auth;
    const { organizationId } = await params;

    // Check if user is admin or gründer
    const { data: membership, error: membershipError } = await supabase
        .from("organization_members")
        .select("role, membership_status")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .eq("membership_status", "active")
        .single();

    if (membershipError || !membership) {
        return jsonError("Forbidden", 403);
    }

    const canManage = membership.role === USER_ROLES.GRUENDER || membership.role === USER_ROLES.ADMIN;

    if (!canManage) {
        return jsonError("Forbidden", 403);
    }

    // Fetch pending members with profile info
    const { data: pendingMembers, error: pendingError } = await supabase
        .from("organization_members")
        .select("id, user_id, joined_at, created_at")
        .eq("organization_id", organizationId)
        .eq("membership_status", "pending")
        .order("created_at", { ascending: true });

    if (pendingError) {
        return jsonError("Failed to fetch pending members", 500, pendingError.code, pendingError.message);
    }

    const userIds = pendingMembers?.map(m => m.user_id).filter(Boolean) || [];
    const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds)
        : { data: [] };

    const profileMap = new Map(
        (profiles || []).map(p => [p.id, p as { id: string; username: string | null; display_name: string | null; avatar_url: string | null }])
    );

    const sanitizedMembers = pendingMembers?.map(member => {
        const profile = profileMap.get(member.user_id) || null;
        return {
            id: member.id,
            user_id: member.user_id,
            joined_at: member.joined_at,
            user: profile ? { id: profile.id, username: profile.username, display_name: profile.display_name, avatar_url: profile.avatar_url } : null,
        };
    });

    return jsonSuccess({ pendingMembers: sanitizedMembers });
}
