import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/communities/[id]/follow
export async function GET(request: Request, { params }: RouteParams) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return;
    if (auth instanceof Response) return auth;
    const { user, supabase } = auth;
    const { id: organizationId } = await params;

    const { data: follow, error: followError } = await supabase
        .from("community_followers")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (followError) {
        return jsonError("Failed to check follow status", 500, followError.code, followError.message);
    }

    return jsonSuccess({ following: !!follow });
}

// POST /api/communities/[id]/follow
export async function POST(request: Request, { params }: RouteParams) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return;
    if (auth instanceof Response) return auth;
    const { user, supabase } = auth;
    const { id: organizationId } = await params;

    const { data: existingFollow, error: followError } = await supabase
        .from("community_followers")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (followError) {
        return jsonError("Failed to check follow status", 500, followError.code, followError.message);
    }

    if (existingFollow) {
        const { error: deleteError } = await supabase
            .from("community_followers")
            .delete()
            .eq("id", existingFollow.id);

        if (deleteError) {
            return jsonError("Failed to unfollow", 500, deleteError.code, deleteError.message);
        }

        return jsonSuccess({ following: false, message: "Successfully unfollowed" });
    } else {
        const { error: insertError } = await supabase
            .from("community_followers")
            .insert({ organization_id: organizationId, user_id: user.id });

        if (insertError) {
            return jsonError("Failed to follow", 500, insertError.code, insertError.message);
        }

        return jsonSuccess({ following: true, message: "Successfully followed" }, 201);
    }
}
