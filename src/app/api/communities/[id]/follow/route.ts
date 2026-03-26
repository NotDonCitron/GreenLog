import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/communities/[id]/follow
// Check if current user follows this organization
export async function GET(request: Request, { params }: RouteParams) {
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

        // Check if user follows this organization
        const { data: follow, error: followError } = await supabase
            .from("community_followers")
            .select("id")
            .eq("organization_id", organizationId)
            .eq("user_id", user.id)
            .maybeSingle();

        if (followError) {
            console.error("Error checking follow status:", followError);
            return NextResponse.json({
                error: "Failed to check follow status",
                details: followError.message
            }, { status: 500 });
        }

        return NextResponse.json({
            following: !!follow
        });

    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/communities/[id]/follow
// Toggle follow/unfollow for the current user
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

        // Check if user already follows this organization
        const { data: existingFollow, error: followError } = await supabase
            .from("community_followers")
            .select("id")
            .eq("organization_id", organizationId)
            .eq("user_id", user.id)
            .maybeSingle();

        if (followError) {
            console.error("Error checking follow status:", followError);
            return NextResponse.json({
                error: "Failed to check follow status",
                details: followError.message
            }, { status: 500 });
        }

        if (existingFollow) {
            // Already following - delete the follow
            const { error: deleteError } = await supabase
                .from("community_followers")
                .delete()
                .eq("id", existingFollow.id);

            if (deleteError) {
                console.error("Error unfollowing:", deleteError);
                return NextResponse.json({
                    error: "Failed to unfollow",
                    details: deleteError.message
                }, { status: 500 });
            }

            return NextResponse.json({
                following: false,
                message: "Successfully unfollowed"
            });
        } else {
            // Not following - insert a new follow
            const { error: insertError } = await supabase
                .from("community_followers")
                .insert({
                    organization_id: organizationId,
                    user_id: user.id
                });

            if (insertError) {
                console.error("Error following:", insertError);
                return NextResponse.json({
                    error: "Failed to follow",
                    details: insertError.message
                }, { status: 500 });
            }

            return NextResponse.json({
                following: true,
                message: "Successfully followed"
            }, { status: 201 });
        }

    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
