import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";

// GET /api/invites/pending
// Get all pending invites for the current user
export async function GET(request: Request) {
  try {
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

    // Get user's email
    const userEmail = user.email?.toLowerCase();
    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    // Get pending invites for this user's email
    const { data: invites, error: invitesError } = await supabase
      .from("organization_invites")
      .select(`
        id,
        email,
        role,
        status,
        expires_at,
        created_at,
        organization:organization_id (
          id,
          name,
          slug,
          organization_type,
          logo_url
        ),
        inviter:profiles!invited_by (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("email", userEmail)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (invitesError) {
      console.error("Error fetching pending invites:", invitesError);
      return NextResponse.json({
        error: "Failed to fetch invites",
        details: invitesError.message
      }, { status: 500 });
    }

    // Filter out expired invites
    const validInvites = (invites || []).filter((invite: { expires_at: string }) => {
      return new Date(invite.expires_at) > new Date();
    });

    return NextResponse.json({ invites: validInvites });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
