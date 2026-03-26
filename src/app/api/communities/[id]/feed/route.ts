import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/communities/[id]/feed
// Return paginated feed for an organization (public via RLS)
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id: organizationId } = await params;
        const { searchParams } = new URL(request.url);

        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
        const offset = (page - 1) * limit;

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

// DELETE /api/communities/[id]/feed?feedId=xxx
// Admin/Gründer can delete feed entries
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id: organizationId } = await params;
        const { searchParams } = new URL(request.url);
        const feedId = searchParams.get("feedId");

        if (!feedId) {
            return NextResponse.json({ error: "feedId is required" }, { status: 400 });
        }

        // Auth: get token from Authorization header (sent by browser client)
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.slice(7);

        // Create server supabase client with the user's JWT
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: { user }, error: userError } = await userClient.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is gründer or admin of this organization
        const { data: membership } = await userClient
            .from("organization_members")
            .select("role")
            .eq("organization_id", organizationId)
            .eq("user_id", user.id)
            .eq("membership_status", "active")
            .single();

        if (!membership || !["gründer", "admin"].includes(membership.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Delete the feed entry
        const { error: deleteError } = await userClient
            .from("community_feed")
            .delete()
            .eq("id", feedId)
            .eq("organization_id", organizationId);

        if (deleteError) {
            console.error("Error deleting feed entry:", deleteError);
            return NextResponse.json({ error: "Failed to delete feed entry" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
