import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

type RouteParams = { params: Promise<{ token: string }> };

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

// POST /api/invites/[token]
// Accept an invite by token
export async function POST(request: Request, { params }: RouteParams) {
    try {
        const { token } = await params;
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

        if (!token) {
            return NextResponse.json({ error: "Token is required" }, { status: 400 });
        }

        const tokenHash = hashToken(token);

        // Find the invite using public RPC to bypass RLS
        const supabasePublic = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || "",
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
        );

        const { data: inviteData, error: inviteError } = await supabasePublic
            .rpc("get_invite_preview", { p_token_hash: tokenHash });

        if (inviteError || !inviteData || inviteData.length === 0) {
            return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
        }

        const invite = inviteData[0] as unknown as {
            id: string;
            organization_id: string;
            email: string;
            role: string;
            status: string;
            expires_at: string;
            invited_by: string | null;
            org_name: string;
            org_type: string;
        };

        // Check if invite is still pending
        if (invite.status !== "pending") {
            return NextResponse.json({
                error: `Invite has already been ${invite.status}`
            }, { status: 400 });
        }

        // Check if invite has expired
        if (new Date(invite.expires_at) < new Date()) {
            // Mark as expired (using authenticated client here is fine if user can update their own potential memberships, 
            // but safer to use a service role if needed. For now, let's keep the expiration check.)
            return NextResponse.json({ error: "Invite has expired" }, { status: 400 });
        }

        // Check if the invited email matches the user's email
        const userEmail = user.email?.toLowerCase();
        if (userEmail && userEmail !== invite.email.toLowerCase()) {
            return NextResponse.json({ error: "This invite was sent to a different email address" }, { status: 403 });
        }

        // Check if user is already a member
        const { data: existingMember } = await supabase
            .from("organization_members")
            .select("id")
            .eq("organization_id", invite.organization_id)
            .eq("user_id", user.id)
            .single();

        if (existingMember) {
            return NextResponse.json({ error: "You are already a member of this organization" }, { status: 409 });
        }

        // Create membership
        const { data: membership, error: membershipError } = await supabase
            .from("organization_members")
            .insert({
                organization_id: invite.organization_id,
                user_id: user.id,
                role: invite.role,
                membership_status: "active",
                joined_at: new Date().toISOString(),
                invited_by: invite.invited_by
            })
            .select()
            .single();

        if (membershipError) {
            console.error("Error creating membership:", membershipError);
            return NextResponse.json({
                error: "Failed to join organization",
                details: membershipError.message
            }, { status: 500 });
        }

        // Mark invite as accepted (using auth client)
        await supabase
            .from("organization_invites")
            .update({
                status: "accepted",
                accepted_at: new Date().toISOString()
            })
            .eq("id", invite.id);

        return NextResponse.json({
            success: true,
            membership: {
                id: membership.id,
                organization_id: membership.organization_id,
                role: membership.role,
                organization: {
                    id: invite.organization_id,
                    name: invite.org_name,
                    organization_type: invite.org_type
                }
            }
        });

    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// GET /api/invites/[token]
// Get invite details (for preview before accepting)
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { token } = await params;

        if (!token) {
            return NextResponse.json({ error: "Token is required" }, { status: 400 });
        }

        const supabasePublic = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || "",
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
        );

        const tokenHash = hashToken(token);

        const { data: invite, error: inviteError } = await supabasePublic
            .rpc("get_invite_preview", { p_token_hash: tokenHash });

        if (inviteError || !invite || invite.length === 0) {
            return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
        }

        // Type the invite from RPC
        const typedInvite = invite[0] as unknown as {
            id: string;
            email: string;
            role: string;
            status: string;
            expires_at: string;
            org_name: string;
            org_type: string;
        };

        return NextResponse.json({
            email: typedInvite.email,
            role: typedInvite.role,
            status: typedInvite.status,
            expires_at: typedInvite.expires_at,
            organization: {
                name: typedInvite.org_name,
                organization_type: typedInvite.org_type
            }
        });

    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
