import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import type { OrganizationActivity } from "@/lib/types";

type RouteParams = { params: Promise<{ organizationId: string }> };

// GET /api/organizations/[organizationId]/activities
// Returns audit trail for organization admins
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { organizationId } = await params;
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

        // Check membership + role (only gründer or admin can view)
        const { data: membership, error: membershipError } = await supabase
            .from("organization_members")
            .select("role")
            .eq("organization_id", organizationId)
            .eq("user_id", user.id)
            .eq("membership_status", "active")
            .single();

        if (membershipError || !membership) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (membership.role !== "gründer" && membership.role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Parse query params
        const url = new URL(request.url);
        const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 50);
        const offset = parseInt(url.searchParams.get("offset") ?? "0");
        const eventType = url.searchParams.get("event_type");

        // Build query
        let query = supabase
            .from("organization_activities")
            .select(
                `
                id,
                organization_id,
                user_id,
                event_type,
                target_type,
                target_id,
                target_name,
                metadata,
                created_at,
                user:profiles!user_id (
                    id,
                    username,
                    display_name,
                    avatar_url
                )
                `,
                { count: "exact" }
            )
            .eq("organization_id", organizationId)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (eventType) {
            query = query.eq("event_type", eventType);
        }

        const { data: activities, count, error } = await query;

        if (error) {
            console.error("Error fetching organization activities:", error);
            return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
        }

        const typedActivities = (activities ?? []) as OrganizationActivity[];
        const total = count ?? 0;

        return NextResponse.json({
            activities: typedActivities,
            total,
            has_more: offset + limit < total,
        });

    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}