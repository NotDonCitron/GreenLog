import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";

type RouteParams = { params: Promise<{ organizationId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { organizationId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "5", 10), 20);

    const authHeader = request.headers.get("Authorization");
    const accessToken = authHeader?.replace("Bearer ", "");

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getAuthenticatedClient(accessToken);

    // Verify user is org member
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("role, membership_status")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .eq("membership_status", "active")
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch org strain IDs + slugs (single query)
    const { data: orgStrains } = await supabase
      .from("strains")
      .select("id, slug, name")
      .eq("organization_id", organizationId);

    if (!orgStrains || orgStrains.length === 0) {
      return NextResponse.json({ activities: [] });
    }

    const orgStrainIds = orgStrains.map(s => s.id);
    const slugMap = new Map(orgStrains.map(s => [s.id, s.slug]));
    const nameMap = new Map(orgStrains.map(s => [s.id, s.name]));

    // Fetch all relevant activities in one query (both strain_created + rating)
    const { data: activities, error: activitiesError } = await supabase
      .from("user_activities")
      .select(`
        id,
        activity_type,
        created_at,
        target_id,
        user_id,
        metadata,
        user:profiles!user_id(id, display_name, username)
      `)
      .in("activity_type", ["strain_created", "rating"])
      .in("target_id", orgStrainIds)
      .order("created_at", { ascending: false })
      .limit(limit * 2);

    if (activitiesError) {
      console.error("Activities query error:", activitiesError);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    // Map to OrgActivityItem with slug from strains map
    const mappedActivities = (activities ?? [])
      .map(a => ({
        id: a.id,
        type: a.activity_type as "strain_created" | "rating",
        user: {
          displayName: (a.user as { display_name?: string } | null)?.display_name ?? "",
          username: (a.user as { username?: string } | null)?.username ?? "",
        },
        strain: {
          id: a.target_id as string,
          name: nameMap.get(a.target_id as string) ?? "",
          slug: slugMap.get(a.target_id as string) ?? "",
        },
        rating: a.activity_type === "rating"
          ? (a.metadata as { rating?: number })?.rating ?? null
          : undefined,
        createdAt: a.created_at,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return NextResponse.json({ activities: mappedActivities });

  } catch (error) {
    console.error("Error fetching org activities:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}