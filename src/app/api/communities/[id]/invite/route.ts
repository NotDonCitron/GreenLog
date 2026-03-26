import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { createHash, randomBytes } from "crypto";

type RouteParams = { params: Promise<{ id: string }> };

function generateInviteToken(): string {
    return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

// POST /api/communities/[id]/invite
// Invite a new admin to the community (Gründer only)
export async function POST(request: Request, { params }: RouteParams) {
    try {
        const { id: organizationId } = await params;
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

        // Check if user is the Gründer of this organization
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

        // Only the Gründer can invite admins
        if (membership.role !== "gründer") {
            return NextResponse.json({
                error: "Only the Gründer can invite admins"
            }, { status: 403 });
        }

        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: "email is required" }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
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
                role: "admin",
                token_hash: tokenHash,
                expires_at: expiresAt,
                invited_by: user.id,
                status: "pending"
            })
            .select()
            .single();

        if (inviteError) {
            // Handle unique violation (user already invited)
            if (inviteError.code === "23505") {
                return NextResponse.json({ error: "An invite for this email already exists" }, { status: 409 });
            }
            console.error("Error creating invite:", inviteError);
            return NextResponse.json({
                error: "Failed to create invite",
                details: inviteError.message
            }, { status: 500 });
        }

        // Build the invite URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://greenlog.app";
        const inviteUrl = `${baseUrl}/invite/${token}`;

        return NextResponse.json({
            inviteUrl
        }, { status: 201 });

    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
