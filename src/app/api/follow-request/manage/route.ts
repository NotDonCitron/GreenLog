import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { getAuthenticatedClient } from "@/lib/supabase/client";

export async function GET(request: Request) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth || auth instanceof Response) return auth || jsonError("Unauthorized", 401);
    const { user, supabase } = auth;

    const { data: requests, error: requestsError } = await supabase
        .from("follow_requests")
        .select(`
            id, status, created_at,
            requester:profiles!follow_requests_requester_id_fkey(id, username, display_name, avatar_url, bio)
        `)
        .eq("target_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    if (requestsError) {
        return jsonError(requestsError.message, 500, requestsError.code);
    }

    return jsonSuccess({ requests: requests || [] });
}

export async function PUT(request: Request) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth || auth instanceof Response) return auth || jsonError("Unauthorized", 401);
    const { user, supabase } = auth;

    const body = await request.json();
    const { requestId, action } = body;

    if (!requestId || !action || !["approve", "reject"].includes(action)) {
        return jsonError("Invalid request", 400);
    }

    const { data: followRequest, error: getError } = await supabase
        .from("follow_requests")
        .select("requester_id, target_id, status")
        .eq("id", requestId)
        .single();

    if (getError || !followRequest) {
        return jsonError("Request not found", 404);
    }

    if (followRequest.target_id !== user.id) {
        return jsonError("Unauthorized", 403);
    }

    if (action === "approve") {
        const { error: followError } = await supabase
            .rpc("create_follow", {
                follower_uuid: followRequest.requester_id,
                following_uuid: user.id
            });

        if (followError) {
            return jsonError(followError.message, 500, followError.code);
        }

        const { error: updateError } = await supabase
            .from("follow_requests")
            .update({ status: "approved" })
            .eq("id", requestId);

        if (updateError) {
            return jsonError(updateError.message, 500, updateError.code);
        }

        return jsonSuccess({ success: true, action: "approved" });
    } else {
        const { error: updateError } = await supabase
            .from("follow_requests")
            .update({ status: "rejected" })
            .eq("id", requestId);

        if (updateError) {
            return jsonError(updateError.message, 500, updateError.code);
        }

        return jsonSuccess({ success: true, action: "rejected" });
    }
}
