import { createClient } from "@supabase/supabase-js";
import { decodeToken } from "@/lib/auth/utils";
import { jsonSuccess, jsonError } from "@/lib/api-response";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function getSupabaseClient(token: string) {
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authHeader = request.headers.get("Authorization");
    const accessToken = authHeader?.replace("Bearer ", "");

    if (!accessToken) {
        return jsonError("Unauthorized", 401);
    }

    const userId = decodeToken(accessToken);
    if (!userId) {
        return jsonError("Invalid token", 401);
    }

    const supabase = getSupabaseClient(accessToken);
    const { id: organizationId } = await params;

    const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id, status")
        .eq("id", organizationId)
        .single();

    if (orgError || !org) {
        return jsonError("not_found", 404);
    }

    if (org.status !== "active") {
        return jsonError("Organization not active", 400);
    }

    const { data: existingMember } = await supabase
        .from("organization_members")
        .select("id, membership_status")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .single();

    if (existingMember && existingMember.membership_status === "active") {
        return jsonError("already_member", 400);
    }

    if (existingMember && existingMember.membership_status === "invited") {
        const { error: updateError } = await supabase
            .from("organization_members")
            .update({ membership_status: "active", joined_at: new Date().toISOString() })
            .eq("id", existingMember.id);

        if (updateError) {
            return jsonError(updateError.message, 500, updateError.code);
        }
    } else if (!existingMember) {
        const { error: insertError } = await supabase
            .from("organization_members")
            .insert({
                organization_id: organizationId,
                user_id: userId,
                role: "member",
                membership_status: "active",
                joined_at: new Date().toISOString()
            });

        if (insertError) {
            if (insertError.code === "23505") {
                return jsonError("already_member", 400);
            }
            return jsonError(insertError.message, 500, insertError.code);
        }
    }

    return jsonSuccess({ success: true });
}
