import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";

type RouteParams = { params: Promise<{ inviteId: string }> };

// POST /api/invites/[inviteId]/accept
// Accept an invite by ID (for in-app use)
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { inviteId } = await params;
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

    // Get the invite
    const { data: invite, error: inviteError } = await supabase
      .from("organization_invites")
      .select("*")
      .eq("id", inviteId)
      .eq("status", "pending")
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: "Invite not found or already processed" }, { status: 404 });
    }

    // Check if invite has expired
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invite has expired" }, { status: 400 });
    }

    // Check if the invited email matches the user's email
    const userEmail = user.email?.toLowerCase();
    if (userEmail && userEmail !== invite.email.toLowerCase()) {
      return NextResponse.json({ error: "This invite was sent to a different email address" }, { status: 403 });
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("organization_memberships")
      .select("id")
      .eq("organization_id", invite.organization_id)
      .eq("user_id", user.id)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: "You are already a member of this organization" }, { status: 409 });
    }

    // Create membership
    const { data: membership, error: membershipError } = await supabase
      .from("organization_memberships")
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

    // Mark invite as accepted
    await supabase
      .from("organization_invites")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString()
      })
      .eq("id", invite.id);

    // Get organization info
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, slug, organization_type")
      .eq("id", invite.organization_id)
      .single();

    return NextResponse.json({
      success: true,
      membership: {
        id: membership.id,
        organization_id: membership.organization_id,
        role: membership.role,
        organization: org
      }
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
