import { createClient } from "@supabase/supabase-js";
import { writeOrganizationActivity } from "@/lib/organization-activities";
import { jsonSuccess, jsonError } from "@/lib/api-response";

type RouteParams = { params: Promise<{ token: string }> };

async function getAuthenticatedClient(accessToken: string) {
    const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );
    // Supabase's getUser() uses internal session storage, not Authorization header.
    // Must call setSession() to properly set the session so getUser() works.
    await client.auth.setSession({
        access_token: accessToken,
        refresh_token: "",
    } as { access_token: string; refresh_token: string });
    return client;
}

// POST /api/invites/[token]/accept
export async function POST(request: Request, { params }: RouteParams) {
    const { token } = await params;
    const authHeader = request.headers.get("Authorization");
    const accessToken = authHeader?.replace("Bearer ", "");

    if (!accessToken) {
        return jsonError("Unauthorized", 401);
    }

    const supabase = await getAuthenticatedClient(accessToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return jsonError("Unauthorized", 401);
    }

    const { data: invite, error: inviteError } = await supabase
        .from("organization_invites")
        .select("*")
        .eq("token_hash", token)
        .eq("status", "pending")
        .single();

    if (inviteError || !invite) {
        return jsonError("Invite not found or already processed", 404);
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

    await writeOrganizationActivity({
        supabase,
        organizationId: invite.organization_id,
        userId: user.id,
        eventType: 'invite_accepted',
        targetType: 'invite',
        target: { id: invite.id, name: invite.email },
        metadata: { role: invite.role },
    }).catch(err => console.error('Activity write failed:', err));

    await writeOrganizationActivity({
        supabase,
        organizationId: invite.organization_id,
        userId: user.id,
        eventType: 'member_joined',
        targetType: 'member',
        target: { id: membership.id, name: user.email || undefined },
        metadata: { role: invite.role },
    }).catch(err => console.error('Activity write failed:', err));

    await supabase
        .from("organization_invites")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", invite.id);

    const { data: org } = await supabase
        .from("organizations")
        .select("id, name, slug, organization_type")
        .eq("id", invite.organization_id)
        .single();

    return jsonSuccess({
        membership: {
            id: membership.id,
            organization_id: membership.organization_id,
            role: membership.role,
            organization: org
        }
    });
}
