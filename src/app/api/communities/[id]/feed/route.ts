import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/communities/[id]/feed
// Return paginated feed for an organization
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id: organizationId } = await params;
        const { searchParams } = new URL(request.url);

        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
        const offset = (page - 1) * limit;

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

        // Fetch paginated feed entries
        const { data: feedEntries, error: feedError, count } = await supabase
            .from("community_feed")
            .select(`
                id,
                organization_id,
                event_type,
                reference_id,
                user_id,
                created_at
            `, { count: "exact" })
            .eq("organization_id", organizationId)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (feedError) {
            console.error("Error fetching feed:", feedError);
            return NextResponse.json({
                error: "Failed to fetch feed",
                details: feedError.message
            }, { status: 500 });
        }

        // Fetch user profiles for the feed entries
        const userIds = feedEntries?.map(entry => entry.user_id).filter(Boolean) || [];
        const { data: profiles } = userIds.length > 0
            ? await supabase
                .from("profiles")
                .select("id, username, display_name, avatar_url")
                .in("id", userIds)
            : { data: [] };

        const profileMap = new Map(
            (profiles || []).map(p => [p.id, p])
        );

        // Combine feed entries with user profiles
        const feedWithUsers = feedEntries?.map(entry => {
            const profile = profileMap.get(entry.user_id) || null;
            return {
                ...entry,
                user: profile ? {
                    id: profile.id,
                    username: profile.username,
                    display_name: profile.display_name,
                    avatar_url: profile.avatar_url
                } : null
            };
        });

        const totalPages = Math.ceil((count || 0) / limit);

        return NextResponse.json({
            feed: feedWithUsers,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages
            }
        });

    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
