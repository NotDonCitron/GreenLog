import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";

type RouteParams = { params: Promise<{ organizationId: string }> };

// GET /api/organizations/[organizationId]/analytics/activity
// Returns activity heatmap data (hour by day-of-week)
export async function GET(request: Request, { params }: RouteParams) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof Response) return auth;

  const { user, supabase } = auth;
  const { organizationId } = await params;

  // Check membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("membership_status", "active")
    .single();

  if (!membership) {
    return jsonError("Forbidden", 403);
  }

  // Get all active member user_ids
  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("membership_status", "active");

  const memberIds = members?.map(m => m.user_id) || [];
  if (memberIds.length === 0) {
    return jsonSuccess({
      heatmap: Array(7).fill(null).map(() => Array(24).fill(0)),
      total_activities: 0,
      active_members: 0,
    });
  }

  // Get activity timestamps from organization_activities for this org
  // Focus on last 30 days for relevant heatmap
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: activities } = await supabase
    .from("organization_activities")
    .select("created_at")
    .eq("organization_id", organizationId)
    .gte("created_at", thirtyDaysAgo.toISOString());

  // Build heatmap: [dayOfWeek][hour]
  // dayOfWeek: 0=Sunday, 1=Monday, ... 6=Saturday
  // hour: 0-23
  const heatmap: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
  let totalActivities = 0;

  for (const activity of (activities || [])) {
    const date = new Date(activity.created_at);
    const dayOfWeek = date.getDay(); // 0-6
    const hour = date.getHours(); // 0-23
    heatmap[dayOfWeek][hour]++;
    totalActivities++;
  }

  return jsonSuccess({
    heatmap,
    total_activities: totalActivities,
    active_members: memberIds.length,
    days_of_week: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
    hours: Array.from({ length: 24 }, (_, i) => i),
  });
}
