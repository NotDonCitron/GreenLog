import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { USER_ROLES } from "@/lib/roles";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth || auth instanceof Response) return auth || jsonError("Unauthorized", 401);
    const { user, supabase } = auth;
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
        .eq("user_id", user.id)
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
                user_id: user.id,
                role: USER_ROLES.MEMBER,
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
