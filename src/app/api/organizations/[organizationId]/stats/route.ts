import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";

type RouteParams = { params: Promise<{ organizationId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { organizationId } = await params;
    const authHeader = request.headers.get("Authorization");
    const accessToken = authHeader?.replace("Bearer ", "");

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await getAuthenticatedClient(accessToken);

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

    // Fetch member count
    const { count: memberCount } = await supabase
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("membership_status", "active");

    // Fetch strain count + newest strain (parallel)
    const [{ count: strainCount }, { data: newestStrainData }] = await Promise.all([
      supabase
        .from("strains")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      supabase
        .from("strains")
        .select("id, name, slug")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    const newestStrain = newestStrainData && newestStrainData.length > 0
      ? { id: newestStrainData[0].id, name: newestStrainData[0].name, slug: newestStrainData[0].slug }
      : null;

    return NextResponse.json({
      memberCount: memberCount ?? 0,
      strainCount: strainCount ?? 0,
      newestStrain,
    });

  } catch (error) {
    console.error("Error fetching org stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
