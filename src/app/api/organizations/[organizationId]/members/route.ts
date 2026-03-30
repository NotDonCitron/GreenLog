import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { writeOrganizationActivity } from "@/lib/organization-activities";

type RouteParams = { params: Promise<{ organizationId: string }> };

// GET /api/organizations/[organizationId]/members
// List all members of an organization
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { organizationId } = await params;
        const authHeader = request.headers.get("Authorization");
        const accessToken = authHeader?.replace("Bearer ", "");

        if (!accessToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getAuthenticatedClient(accessToken);

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is org manager
        const { data: membership, error: membershipError } = await supabase
            .from("organization_members")
            .select("role, membership_status")
            .eq("organization_id", organizationId)
            .eq("user_id", user.id)
            .eq("membership_status", "active")
            .single();

        if (membershipError || !membership) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const canManage = membership.role === "gründer" || membership.role === "admin";

        // Fetch all members (no join to avoid RLS issues)
        const { data: members, error: membersError } = await supabase
            .from("organization_members")
            .select("id, role, membership_status, joined_at, invited_by, created_at, user_id")
            .eq("organization_id", organizationId)
            .order("created_at", { ascending: true });

        if (membersError) {
            console.error("Error fetching members:", membersError);
            return NextResponse.json({
                error: "Failed to fetch members",
                details: membersError.message
            }, { status: 500 });
        }

        // Fetch profiles separately
        const userIds = members?.map(m => m.user_id).filter(Boolean) || [];
        const { data: profiles } = userIds.length > 0
            ? await supabase
                .from("profiles")
                .select("id, username, display_name, avatar_url")
                .in("id", userIds)
            : { data: [] };

        const profileMap = new Map(
            (profiles || []).map(p => [p.id, p as { id: string; username: string | null; display_name: string | null; avatar_url: string | null }])
        );

        // If not a manager, filter out sensitive data
        const sanitizedMembers = members?.map(member => {
            const profile = profileMap.get(member.user_id) || null;
            return {
                id: member.id,
                role: member.role,
                membership_status: member.membership_status,
                joined_at: member.joined_at,
                user: profile ? {
                    id: profile.id,
                    username: profile.username,
                    display_name: profile.display_name,
                    avatar_url: profile.avatar_url
                } : null,
                // Only include if user can manage
                invited_by: canManage ? member.invited_by : undefined
            };
        });

        return NextResponse.json({ members: sanitizedMembers });

    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH /api/organizations/[organizationId]/members
// Update a member's role or status (suspend/activate)
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const { organizationId } = await params;
        const authHeader = request.headers.get("Authorization");
        const accessToken = authHeader?.replace("Bearer ", "");

        if (!accessToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getAuthenticatedClient(accessToken);

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { member_id, role, membership_status } = body;

        if (!member_id) {
            return NextResponse.json({ error: "member_id is required" }, { status: 400 });
        }

        // Get current user's membership and role
        const { data: currentMember, error: membershipError } = await supabase
            .from("organization_members")
            .select("role, membership_status")
            .eq("organization_id", organizationId)
            .eq("user_id", user.id)
            .eq("membership_status", "active")
            .single();

        if (membershipError || !currentMember) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const isOwner = currentMember.role === "gründer";
        const isAdmin = currentMember.role === "admin";

        if (!isOwner && !isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Get target member
        const { data: targetMember, error: targetError } = await supabase
            .from("organization_members")
            .select("user_id, role, membership_status")
            .eq("id", member_id)
            .eq("organization_id", organizationId)
            .single();

        if (targetError || !targetMember) {
            return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        // Cannot modify self
        if (targetMember.user_id === user.id) {
            return NextResponse.json({ error: "Cannot modify your own membership" }, { status: 400 });
        }

        // Cannot modify gründer
        if (targetMember.role === "gründer") {
            return NextResponse.json({ error: "Cannot modify the gründer" }, { status: 400 });
        }

        // Only gründer can promote to admin
        if (role && (role === "admin" || role === "gründer")) {
            if (!isOwner) {
                return NextResponse.json({ error: "Only gründer can assign admin or gründer role" }, { status: 403 });
            }
        }

        // Only gründer can assign admin role to another admin
        if (targetMember.role === "admin" && !isOwner) {
            return NextResponse.json({ error: "Only gründer can modify admin roles" }, { status: 403 });
        }

        // Build update payload
        const updates: Record<string, any> = {};
        if (role && ["admin", "staff", "member"].includes(role)) {
            updates.role = role;
        }
        if (membership_status && ["active", "suspended"].includes(membership_status)) {
            updates.membership_status = membership_status;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
        }

        const { data: updated, error: updateError } = await supabase
            .from("organization_members")
            .update(updates)
            .eq("id", member_id)
            .eq("organization_id", organizationId)
            .select()
            .single();

        if (updateError) {
            console.error("Error updating member:", updateError);
            return NextResponse.json({
                error: "Failed to update member",
                details: updateError.message
            }, { status: 500 });
        }

        // Write role_changed activity if role was updated
        if (updates.role && targetMember) {
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

        return NextResponse.json({ member: updated });

    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/organizations/[organizationId]/members
// Remove a member from the organization
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { organizationId } = await params;
        const authHeader = request.headers.get("Authorization");
        const accessToken = authHeader?.replace("Bearer ", "");

        if (!accessToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getAuthenticatedClient(accessToken);

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const member_id = searchParams.get("member_id");

        if (!member_id) {
            return NextResponse.json({ error: "member_id query parameter is required" }, { status: 400 });
        }

        // Get current user's membership
        const { data: currentMember, error: membershipError } = await supabase
            .from("organization_members")
            .select("role")
            .eq("organization_id", organizationId)
            .eq("user_id", user.id)
            .eq("membership_status", "active")
            .single();

        if (membershipError || !currentMember) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const isOwner = currentMember.role === "gründer";
        const isAdmin = currentMember.role === "admin";

        if (!isOwner && !isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Get target member
        const { data: targetMember, error: targetError } = await supabase
            .from("organization_members")
            .select("user_id, role")
            .eq("id", member_id)
            .eq("organization_id", organizationId)
            .single();

        if (targetError || !targetMember) {
            return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        // Cannot remove self through this endpoint (use leave org flow)
        if (targetMember.user_id === user.id) {
            return NextResponse.json({ error: "Cannot remove yourself. Use leave organization instead." }, { status: 400 });
        }

        // Cannot remove gründer
        if (targetMember.role === "gründer") {
            return NextResponse.json({ error: "Cannot remove the gründer" }, { status: 400 });
        }

        // Only gründer can remove admins
        if (targetMember.role === "admin" && !isOwner) {
            return NextResponse.json({ error: "Only gründer can remove admins" }, { status: 403 });
        }

        const { error: deleteError } = await supabase
            .from("organization_members")
            .delete()
            .eq("id", member_id)
            .eq("organization_id", organizationId);

        if (deleteError) {
            console.error("Error removing member:", deleteError);
            return NextResponse.json({
                error: "Failed to remove member",
                details: deleteError.message
            }, { status: 500 });
        }

        // Write member_removed activity
        await writeOrganizationActivity({
            supabase,
            organizationId,
            userId: user.id,
            eventType: 'member_removed',
            targetType: 'member',
            target: { id: member_id, name: targetMember.user_id },
            metadata: { removedRole: targetMember.role },
        }).catch(err => console.error('Activity write failed:', err));

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
