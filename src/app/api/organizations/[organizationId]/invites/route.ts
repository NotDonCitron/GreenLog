import { getAuthenticatedClient } from "@/lib/supabase/client";
import { createHash, randomBytes } from "crypto";
import { writeOrganizationActivity } from "@/lib/organization-activities";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";

type RouteParams = { params: Promise<{ organizationId: string }> };

function generateInviteToken(): string {
    return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

// GET /api/organizations/[organizationId]/invites
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

    if (!canManage) {
        return jsonError("Forbidden", 403);
    }

    const { data: invites, error: invitesError } = await supabase
        .from("organization_invites")
        .select("id, email, role, status, expires_at, accepted_at, invited_by, created_at")
        .eq("organization_id", organizationId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    if (invitesError) {
        return jsonError("Failed to fetch invites", 500, invitesError.code, invitesError.message);
    }

    return jsonSuccess({ invites });
}

// POST /api/organizations/[organizationId]/invites
export async function POST(request: Request, { params }: RouteParams) {
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

    if (!canManage) {
        return jsonError("Forbidden", 403);
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
        return jsonError("email and role are required", 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return jsonError("Invalid email format", 400);
    }

    if (!["admin", "staff", "member"].includes(role)) {
        return jsonError("role must be admin, staff, or member", 400);
    }

    if (role === "admin" && membership.role !== "gründer") {
        return jsonError("Only gründer can invite admins", 403);
    }

    const { data: inviteeProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

    if (inviteeProfile) {
        const { data: existingMember } = await supabase
            .from("organization_members")
            .select("id")
            .eq("organization_id", organizationId)
            .eq("user_id", inviteeProfile.id)
            .eq("membership_status", "active")
            .maybeSingle();

        if (existingMember) {
            return jsonError("User is already a member", 409);
        }
    }

    await supabase
        .from("organization_invites")
        .update({ status: "revoked" })
        .eq("organization_id", organizationId)
        .eq("email", email.toLowerCase())
        .eq("status", "pending");

    const token = generateInviteToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: invite, error: inviteError } = await supabase
        .from("organization_invites")
        .insert({
            organization_id: organizationId,
            email: email.toLowerCase(),
            role,
            token_hash: tokenHash,
            expires_at: expiresAt,
            invited_by: user.id,
            status: "pending"
        })
        .select()
        .single();

    if (inviteError) {
        return jsonError("Failed to create invite", 500, inviteError.code, inviteError.message);
    }

    await writeOrganizationActivity({
        supabase,
        organizationId,
        userId: user.id,
        eventType: 'invite_sent',
        targetType: 'invite',
        target: { id: invite.id, name: invite.email },
        metadata: { role: invite.role },
    }).catch(err => console.error('Activity write failed:', err));

    return jsonSuccess({
        invite: { id: invite.id, email: invite.email, role: invite.role, expires_at: invite.expires_at },
        token
    }, 201);
}

// DELETE /api/organizations/[organizationId]/invites?id=xxx
export async function DELETE(request: Request, { params }: RouteParams) {
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

    if (!canManage) {
        return jsonError("Forbidden", 403);
    }

    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get("id");

    if (!inviteId) {
        return jsonError("Invite ID is required", 400);
    }

    const { error: revokeError } = await supabase
        .from("organization_invites")
        .update({ status: "revoked" })
        .eq("id", inviteId)
        .eq("organization_id", organizationId)
        .eq("status", "pending");

    if (revokeError) {
        return jsonError("Failed to revoke invite", 500, revokeError.code, revokeError.message);
    }

    return jsonSuccess({ success: true });
}
