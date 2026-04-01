import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { jsonSuccess, jsonError } from "@/lib/api-response";

type RouteParams = { params: Promise<{ token: string }> };

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

// POST /api/invites/[token]
export async function POST(request: Request, { params }: RouteParams) {
    const { token } = await params;
    const authHeader = request.headers.get("Authorization");
    const accessToken = authHeader?.replace("Bearer ", "");

    if (!accessToken) {
        return jsonError("Unauthorized", 401);
    }

    const supabase = getAuthenticatedClient(accessToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return jsonError("Unauthorized", 401);
    }

    if (!token) {
        return jsonError("Token is required", 400);
    }

    const tokenHash = hashToken(token);
    const supabasePublic = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    );

    const { data: inviteData, error: inviteError } = await supabasePublic
        .rpc("get_invite_preview", { p_token_hash: tokenHash });

    if (inviteError || !inviteData || inviteData.length === 0) {
        return jsonError("Invalid invite token", 404);
    }

    const invite = inviteData[0] as unknown as {
        id: string; organization_id: string; email: string; role: string;
        status: string; expires_at: string; invited_by: string | null;
        org_name: string; org_type: string;
    };

    if (invite.status !== "pending") {
        return jsonError(`Invite has already been ${invite.status}`, 400);
    }

    if (new Date(invite.expires_at) < new Date()) {
        return jsonError("Invite has expired", 400);
    }

    const userEmail = user.email?.toLowerCase();
    if (userEmail && userEmail !== invite.email.toLowerCase()) {
        return jsonError("This invite was sent to a different email address", 403);
    }

    const { data: existingMember } = await supabase
        .from("organization_members")
        .select("id")
        .eq("organization_id", invite.organization_id)
        .eq("user_id", user.id)
        .single();

    if (existingMember) {
        return jsonError("You are already a member of this organization", 409);
    }

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
        return jsonError("Failed to join organization", 500, membershipError.code, membershipError.message);
    }

    await supabase
        .from("organization_invites")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", invite.id);

    return jsonSuccess({
        membership: {
            id: membership.id,
            organization_id: membership.organization_id,
            role: membership.role,
            organization: { id: invite.organization_id, name: invite.org_name, organization_type: invite.org_type }
        }
    });
}

// GET /api/invites/[token]
export async function GET(request: Request, { params }: RouteParams) {
    const { token } = await params;

    if (!token) {
        return jsonError("Token is required", 400);
    }

    const supabasePublic = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    );

    const tokenHash = hashToken(token);

    const { data: invite, error: inviteError } = await supabasePublic
        .rpc("get_invite_preview", { p_token_hash: tokenHash });

    if (inviteError || !invite || invite.length === 0) {
        return jsonError("Invalid invite token", 404);
    }

    const typedInvite = invite[0] as unknown as {
        id: string; email: string; role: string; status: string;
        expires_at: string; org_name: string; org_type: string;
    };

    return jsonSuccess({
        email: typedInvite.email,
        role: typedInvite.role,
        status: typedInvite.status,
        expires_at: typedInvite.expires_at,
        organization: { name: typedInvite.org_name, organization_type: typedInvite.org_type }
    });
}

function getAuthenticatedClient(accessToken: string) {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        {
            global: { headers: { Authorization: `Bearer ${accessToken}` } },
            auth: { autoRefreshToken: false, persistSession: false }
        }
    );
}
