import { createServerSupabaseClient } from "@/lib/supabase/server";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { USER_ROLES } from "@/lib/roles";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/communities/[id]/feed
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id: organizationId } = await params;
        const { searchParams } = new URL(request.url);

        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
        const offset = (page - 1) * limit;

        // Use server client — feed is public-read via RLS
        const supabase = await createServerSupabaseClient();

        const { data: feedEntries, error: feedError, count } = await supabase
            .from("community_feed")
            .select(`
                id, organization_id, event_type, reference_id, user_id, created_at
            `, { count: "exact" })
            .eq("organization_id", organizationId)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (feedError) {
            return jsonError("Failed to fetch feed", 500, feedError.code, feedError.message);
        }

        const userIds = feedEntries?.map(entry => entry.user_id).filter(Boolean) || [];
        const { data: profiles } = userIds.length > 0
            ? await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds)
            : { data: [] };

        const profileMap = new Map((profiles || []).map(p => [p.id, p]));

        const feedWithUsers = feedEntries?.map(entry => {
            const profile = profileMap.get(entry.user_id) || null;
            return {
                ...entry,
                user: profile ? { id: profile.id, username: profile.username, display_name: profile.display_name, avatar_url: profile.avatar_url } : null
            };
        });

        const totalPages = Math.ceil((count || 0) / limit);

        return jsonSuccess({
            feed: feedWithUsers,
            pagination: { page, limit, total: count || 0, totalPages }
        });

    } catch (error) {
        console.error("Unexpected error:", error);
        return jsonError("Internal server error", 500);
    }
}

// DELETE /api/communities/[id]/feed?feedId=xxx
export async function DELETE(request: Request, { params }: RouteParams) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (auth instanceof Response) return auth;
    const { user, supabase: userClient } = auth;

    const { id: organizationId } = await params;
    const { searchParams } = new URL(request.url);
    const feedId = searchParams.get("feedId");

    if (!feedId) {
        return jsonError("feedId is required", 400);
    }

    const { data: membership } = await userClient
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .eq("membership_status", "active")
        .single();

    if (!membership || ![USER_ROLES.GRUENDER, USER_ROLES.ADMIN].includes(membership.role)) {
        return jsonError("Forbidden", 403);
    }

    const { error: deleteError } = await userClient
        .from("community_feed")
        .delete()
        .eq("id", feedId)
        .eq("organization_id", organizationId);

    if (deleteError) {
        return jsonError("Failed to delete feed entry", 500, deleteError.code, deleteError.message);
    }

    return jsonSuccess({ success: true });
}
