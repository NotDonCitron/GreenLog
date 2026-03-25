import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { createHash, randomBytes } from "crypto";

type RouteParams = { params: Promise<{ organizationId: string }> };

function generateInviteToken(): string {
    return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

// GET /api/organizations/[organizationId]/invites
// List all pending invites for an organization
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

        const canManage = membership.role === "owner" || membership.role === "admin";

        if (!canManage) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { data: invites, error: invitesError } = await supabase
            .from("organization_invites")
            .select(`
                id,
                email,
                role,
                status,
                expires_at,
                accepted_at,
                invited_by,
                created_at
            `)
            .eq("organization_id", organizationId)
            .eq("status", "pending")
            .order("created_at", { ascending: false });

        if (invitesError) {
            console.error("Error fetching invites:", invitesError);
            return NextResponse.json({
                error: "Failed to fetch invites",
                details: invitesError.message
            }, { status: 500 });
        }

        return NextResponse.json({ invites });

    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/organizations/[organizationId]/invites
// Create a new invite
export async function POST(request: Request, { params }: RouteParams) {
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

        const canManage = membership.role === "owner" || membership.role === "admin";

        if (!canManage) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Only owner can invite admins
        const body = await request.json();
        const { email, role } = body;

        if (!email || !role) {
            return NextResponse.json({ error: "email and role are required" }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }

        // Validate role
        if (!["admin", "staff", "member"].includes(role)) {
            return NextResponse.json({ error: "role must be admin, staff, or member" }, { status: 400 });
        }

        // Only owner can invite admins
        if (role === "admin" && membership.role !== "owner") {
            return NextResponse.json({ error: "Only owner can invite admins" }, { status: 403 });
        }

        // Check if user is already a member (by email → profile → user_id)
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
                return NextResponse.json({ error: "User is already a member" }, { status: 409 });
            }
        }

        // Revoke any existing pending invites for this email in this org
        await supabase
            .from("organization_invites")
            .update({ status: "revoked" })
            .eq("organization_id", organizationId)
            .eq("email", email.toLowerCase())
            .eq("status", "pending");

        // Create invite token
        const token = generateInviteToken();
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

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
            console.error("Error creating invite:", inviteError);
            return NextResponse.json({
                error: "Failed to create invite",
                details: inviteError.message
            }, { status: 500 });
        }

        // Return the full token only once - frontend handles the rest
        return NextResponse.json({
            invite: {
                id: invite.id,
                email: invite.email,
                role: invite.role,
                expires_at: invite.expires_at
            },
            token // Only returned here, never again
        }, { status: 201 });

    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
