import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { USER_ROLES } from "@/lib/roles";

type RouteParams = { params: Promise<{ id: string }> };

type FeedStrainRow = {
    id: string;
    organization_id: string | null;
    [key: string]: unknown;
};

// GET /api/communities/[id]/feed
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const auth = await authenticateRequest(request, getAuthenticatedClient);
        if (auth instanceof Response) return auth;
        const { user, supabase } = auth;

        const { id: organizationId } = await params;
        const { searchParams } = new URL(request.url);

        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
        const offset = (page - 1) * limit;
        const scanLimit = Math.min(500, Math.max(offset + limit, limit * 10));

        const { data: membershipRows, error: membershipError } = await supabase
            .from("organization_members")
            .select("role")
            .eq("organization_id", organizationId)
            .eq("user_id", user.id)
            .eq("membership_status", "active")
            .limit(1);

        if (membershipError) {
            return jsonError("Failed to verify membership", 500, membershipError.code, membershipError.message);
        }

        if (!membershipRows?.[0]) {
            return jsonError("Forbidden", 403);
        }

        const { data: feedEntries, error: feedError } = await supabase
            .from("community_feed")
            .select(`
                id, organization_id, event_type, reference_id, user_id, created_at
            `)
            .eq("organization_id", organizationId)
            .order("created_at", { ascending: false })
            .range(0, scanLimit - 1);

        if (feedError) {
            return jsonError("Failed to fetch feed", 500, feedError.code, feedError.message);
        }

        const userIds = [...new Set(feedEntries?.map(entry => entry.user_id).filter(Boolean) || [])];
        const { data: profiles } = userIds.length > 0
            ? await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds)
            : { data: [] };

        const profileMap = new Map((profiles || []).map(p => [p.id, p]));

        const strainIds = [
            ...new Set(
                feedEntries
                    ?.filter((entry) => entry.event_type === "strain_created" && entry.reference_id)
                    .map((entry) => entry.reference_id) || []
            ),
        ];
        let strainMap = new Map<string, Omit<FeedStrainRow, "organization_id">>();

        if (strainIds.length > 0) {
            try {
                let strainClient = supabase;

                try {
                    strainClient = getSupabaseAdmin();
                } catch {
                    // The community page only needs public display fields; fall back to RLS-protected reads
                    // when the deployment has no service-role key configured.
                }

                const { data: strains, error: strainError } = await strainClient
                    .from("strains")
                    .select("id, organization_id, name, slug, type, image_url, avg_thc, thc_max, avg_cbd, cbd_max, farmer, manufacturer, brand, flavors, terpenes, effects, is_medical")
                    .in("id", strainIds);

                if (strainError) {
                    console.warn("Community feed strain lookup failed:", strainError.message);
                } else {
                    strainMap = new Map(
                        ((strains || []) as FeedStrainRow[])
                            .filter((strain) => strain.organization_id === null || strain.organization_id === organizationId)
                            .map(({ organization_id: _organizationId, ...strain }) => [strain.id, strain])
                    );
                }
            } catch (error) {
                console.warn("Community feed strain lookup skipped:", error instanceof Error ? error.message : error);
            }
        }

        const enrichedFeed = feedEntries?.map(entry => {
            const profile = profileMap.get(entry.user_id) || null;
            return {
                ...entry,
                user: profile ? { id: profile.id, username: profile.username, display_name: profile.display_name, avatar_url: profile.avatar_url } : null,
                strain: entry.event_type === "strain_created" ? strainMap.get(entry.reference_id) ?? null : null
            };
        }) || [];

        const visibleFeed = enrichedFeed
            .filter((entry) => entry.event_type !== "strain_created" || entry.strain)
            .slice(offset, offset + limit);

        const total = enrichedFeed.filter((entry) => entry.event_type !== "strain_created" || entry.strain).length;
        const totalPages = Math.ceil(total / limit);

        return jsonSuccess({
            feed: visibleFeed,
            pagination: { page, limit, total, totalPages }
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

    const { data: membershipRows, error: membershipError } = await userClient
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .eq("membership_status", "active")
        .limit(1);

    if (membershipError) {
        return jsonError("Failed to verify membership", 500, membershipError.code, membershipError.message);
    }

    const membership = membershipRows?.[0] ?? null;

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
