import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import type { OrganizationActivity } from "@/lib/types";

type RouteParams = { params: Promise<{ organizationId: string }> };

// GET /api/organizations/[organizationId]/activities
export async function GET(request: Request, { params }: RouteParams) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return;
    const { user, supabase } = auth;
    const { organizationId } = await params;

    const { data: membership, error: membershipError } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .eq("membership_status", "active")
        .single();

    if (membershipError || !membership) {
        return jsonError("Forbidden", 403);
    }

    if (membership.role !== "gründer" && membership.role !== "admin") {
        return jsonError("Forbidden", 403);
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 50);
    const offset = parseInt(url.searchParams.get("offset") ?? "0");
    const eventType = url.searchParams.get("event_type");

    let query = supabase
        .from("organization_activities")
        .select(`
            id, organization_id, user_id, event_type, target_type, target_id,
            target_name, metadata, created_at,
            user:profiles!user_id (id, username, display_name, avatar_url)
        `, { count: "exact" })
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (eventType) {
        query = query.eq("event_type", eventType);
    }

    const { data: activities, count, error } = await query;

    if (error) {
        return jsonError("Failed to fetch activities", 500, error.code, error.message);
    }

    const typedActivities = (activities ?? []) as unknown as OrganizationActivity[];
    const total = count ?? 0;

    return jsonSuccess({
        activities: typedActivities,
        total,
        has_more: offset + limit < total,
    });
}
