import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { getAuthenticatedClient } from "@/lib/supabase/client";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth || auth instanceof Response) return auth || jsonError("Unauthorized - no token", 401);
    const { user, supabase } = auth;
    const { userId: targetId } = await params;

    if (user.id === targetId) {
        return jsonError("Cannot follow yourself", 400);
    }

    const { data: targetProfile, error: profileError } = await supabase
        .from("profiles")
        .select("profile_visibility")
        .eq("id", targetId)
        .single();

    if (profileError || !targetProfile) {
        return jsonError("User not found", 404);
    }

    const { data: existingFollow } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetId)
        .single();

    if (existingFollow) {
        return jsonError("Already following", 400);
    }

    if (targetProfile.profile_visibility === "public") {
        const { error: followError } = await supabase
            .from("follows")
            .insert({ follower_id: user.id, following_id: targetId });

        if (followError) {
            return jsonError(followError.message, 500, followError.code);
        }

        return jsonSuccess({ success: true, action: "followed" });
    }

    const { data: existingRequest } = await supabase
        .from("follow_requests")
        .select("id, status")
        .eq("requester_id", user.id)
        .eq("target_id", targetId)
        .single();

    if (existingRequest) {
        if (existingRequest.status === "pending") {
            return jsonError("Request already pending", 400);
        }
        if (existingRequest.status === "rejected") {
            const { error: updateError } = await supabase
                .from("follow_requests")
                .update({ status: "pending", created_at: new Date().toISOString() })
                .eq("id", existingRequest.id);

            if (updateError) {
                return jsonError(updateError.message, 500, updateError.code);
            }
            return jsonSuccess({ success: true, action: "request_sent" });
        }
        if (existingRequest.status === "approved") {
            const { error: followError } = await supabase
                .from("follows")
                .insert({ follower_id: user.id, following_id: targetId });

            if (followError) {
                return jsonError(followError.message, 500, followError.code);
            }
            return jsonSuccess({ success: true, action: "followed" });
        }
    }

    const { error: requestError } = await supabase
        .from("follow_requests")
        .insert({ requester_id: user.id, target_id: targetId, status: "pending" });

    if (requestError) {
        return jsonError(requestError.message, 500, requestError.code);
    }

    return jsonSuccess({ success: true, action: "request_sent" });
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth || auth instanceof Response) return auth || jsonError("Unauthorized", 401);
    const { user, supabase } = auth;
    const { userId: targetId } = await params;

    const { error: deleteError } = await supabase
        .from("follow_requests")
        .delete()
        .eq("requester_id", user.id)
        .eq("target_id", targetId)
        .eq("status", "pending");

    if (deleteError) {
        return jsonError(deleteError.message, 500, deleteError.code);
    }

    return jsonSuccess({ success: true });
}
