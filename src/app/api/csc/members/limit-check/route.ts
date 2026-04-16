import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";

// GET /api/csc/members/limit-check?member_id=xxx&organization_id=xxx
// Returns remaining daily and monthly limits for a member (for UI preview before dispensing)
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("member_id");
    const orgId = searchParams.get("organization_id");

    if (!memberId) return jsonError("member_id is required", 400);
    if (!orgId) return jsonError("organization_id is required", 400);

    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (auth instanceof Response) return auth;
    const { user, supabase } = auth;

    // Check requesting user's membership
    const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", orgId)
        .eq("user_id", user.id)
        .eq("membership_status", "active")
        .single();

    if (!membership) return jsonError("Forbidden", 403);

    // Get member's birthdate for age check
    const { data: profile } = await supabase
        .from("profiles")
        .select("date_of_birth, full_name")
        .eq("id", memberId)
        .single();

    if (!profile) return jsonError("Member not found", 404);

    // Calculate member's age at today
    let isYoungAdult = false;
    if (profile.date_of_birth) {
        const age = Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        isYoungAdult = age >= 18 && age < 21;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Sum today's dispensations
    const { data: todayDispensations } = await supabase
        .from("csc_dispensations")
        .select("amount_grams")
        .eq("member_id", memberId)
        .gte("dispensed_at", todayStart);

    // Sum this month's dispensations
    const { data: monthDispensations } = await supabase
        .from("csc_dispensations")
        .select("amount_grams")
        .eq("member_id", memberId)
        .gte("dispensed_at", monthStart);

    const todayTotal = todayDispensations?.reduce((sum, d) => sum + Number(d.amount_grams), 0) || 0;
    const monthTotal = monthDispensations?.reduce((sum, d) => sum + Number(d.amount_grams), 0) || 0;

    const limits = {
        daily: { max: 25, used: todayTotal, remaining: Math.max(0, 25 - todayTotal) },
        monthly: { max: isYoungAdult ? 30 : 50, used: monthTotal, remaining: Math.max(0, (isYoungAdult ? 30 : 50) - monthTotal) },
        isYoungAdult,
        profile: profile.full_name || profile.date_of_birth,
    };

    return jsonSuccess({ limits });
}
