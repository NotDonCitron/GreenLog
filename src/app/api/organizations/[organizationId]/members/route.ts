import { getAuthenticatedClient } from "@/lib/supabase/client";
import { writeOrganizationActivity } from "@/lib/organization-activities";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";

type RouteParams = { params: Promise<{ organizationId: string }> };

// GET /api/organizations/[organizationId]/members
export async function GET(request: Request, { params }: RouteParams) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return;
    const { user, supabase } = auth;
    const { organizationId } = await params;

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

    const canManage = membership.role === "gründer" || membership.role === "admin";

    const { data: members, error: membersError } = await supabase
        .from("organization_members")
        .select("id, role, membership_status, joined_at, invited_by, created_at, user_id")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true });

    if (membersError) {
        return jsonError("Failed to fetch members", 500, membersError.code, membersError.message);
    }

    const userIds = members?.map(m => m.user_id).filter(Boolean) || [];
    const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds)
        : { data: [] };

    const profileMap = new Map(
        (profiles || []).map(p => [p.id, p as { id: string; username: string | null; display_name: string | null; avatar_url: string | null }])
    );

    const sanitizedMembers = members?.map(member => {
        const profile = profileMap.get(member.user_id) || null;
        return {
            id: member.id,
            role: member.role,
            membership_status: member.membership_status,
            joined_at: member.joined_at,
            user: profile ? { id: profile.id, username: profile.username, display_name: profile.display_name, avatar_url: profile.avatar_url } : null,
            invited_by: canManage ? member.invited_by : undefined
        };
    });

    return jsonSuccess({ members: sanitizedMembers });
}

// PATCH /api/organizations/[organizationId]/members
export async function PATCH(request: Request, { params }: RouteParams) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return;
    const { user, supabase } = auth;
    const { organizationId } = await params;

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

    const isOwner = currentMember.role === "gründer";
    const isAdmin = currentMember.role === "admin";

    if (!isOwner && !isAdmin) {
        return jsonError("Forbidden", 403);
    }

    const body = await request.json();
    const { member_id, role, membership_status } = body;

    if (!member_id) {
        return jsonError("member_id is required", 400);
    }

    const { data: targetMember, error: targetError } = await supabase
        .from("organization_members")
        .select("user_id, role, membership_status")
        .eq("id", member_id)
        .eq("organization_id", organizationId)
        .single();

    if (targetError || !targetMember) {
        return jsonError("Member not found", 404);
    }

    if (targetMember.user_id === user.id) {
        return jsonError("Cannot modify your own membership", 400);
    }

    if (targetMember.role === "gründer") {
        return jsonError("Cannot modify the gründer", 400);
    }

    if (role && (role === "admin" || role === "gründer") && !isOwner) {
        return jsonError("Only gründer can assign admin or gründer role", 403);
    }

    if (targetMember.role === "admin" && !isOwner) {
        return jsonError("Only gründer can modify admin roles", 403);
    }

    const updates: Record<string, unknown> = {};
    if (role && ["admin", "staff", "member"].includes(role)) updates.role = role;
    if (membership_status && ["active", "suspended"].includes(membership_status)) updates.membership_status = membership_status;

    if (Object.keys(updates).length === 0) {
        return jsonError("No valid updates provided", 400);
    }

    const { data: updated, error: updateError } = await supabase
        .from("organization_members")
        .update(updates)
        .eq("id", member_id)
        .eq("organization_id", organizationId)
        .select()
        .single();

    if (updateError) {
        return jsonError("Failed to update member", 500, updateError.code, updateError.message);
    }

    if (updates.role) {
        await writeOrganizationActivity({
            supabase,
            organizationId,
            userId: user.id,
            eventType: 'role_changed',
            targetType: 'role',
            target: { id: member_id, name: targetMember.user_id },
            metadata: { newRole: updates.role, previousRole: targetMember.role },
        }).catch(err => console.error('Activity write failed:', err));
    }

    return jsonSuccess({ member: updated });
}

// DELETE /api/organizations/[organizationId]/members
export async function DELETE(request: Request, { params }: RouteParams) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return;
    const { user, supabase } = auth;
    const { organizationId } = await params;

    const { searchParams } = new URL(request.url);
    const member_id = searchParams.get("member_id");

    if (!member_id) {
        return jsonError("member_id query parameter is required", 400);
    }

    const { data: currentMember, error: membershipError } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .eq("membership_status", "active")
        .single();

    if (membershipError || !currentMember) {
        return jsonError("Forbidden", 403);
    }

    const isOwner = currentMember.role === "gründer";
    const isAdmin = currentMember.role === "admin";

    if (!isOwner && !isAdmin) {
        return jsonError("Forbidden", 403);
    }

    const { data: targetMember, error: targetError } = await supabase
        .from("organization_members")
        .select("user_id, role")
        .eq("id", member_id)
        .eq("organization_id", organizationId)
        .single();

    if (targetError || !targetMember) {
        return jsonError("Member not found", 404);
    }

    if (targetMember.user_id === user.id) {
        return jsonError("Cannot remove yourself. Use leave organization instead.", 400);
    }

    if (targetMember.role === "gründer") {
        return jsonError("Cannot remove the gründer", 400);
    }

    if (targetMember.role === "admin" && !isOwner) {
        return jsonError("Only gründer can remove admins", 403);
    }

    const { error: deleteError } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", member_id)
        .eq("organization_id", organizationId);

    if (deleteError) {
        return jsonError("Failed to remove member", 500, deleteError.code, deleteError.message);
    }

    await writeOrganizationActivity({
        supabase,
        organizationId,
        userId: user.id,
        eventType: 'member_removed',
        targetType: 'member',
        target: { id: member_id, name: targetMember.user_id },
        metadata: { removedRole: targetMember.role },
    }).catch(err => console.error('Activity write failed:', err));

    return jsonSuccess({ success: true });
}
