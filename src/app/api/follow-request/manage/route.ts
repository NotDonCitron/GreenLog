import { createClient } from "@supabase/supabase-js";
import { jsonSuccess, jsonError } from "@/lib/api-response";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function decodeToken(token: string): string | null {
    try {
        const payload = token.split(".")[1];
        const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
        return decoded.sub || null;
    } catch {
        return null;
    }
}

function getSupabaseClient(token: string) {
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });
}

// GET /api/follow-request/manage
export async function GET(request: Request) {
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

    const { data: requests, error: requestsError } = await supabase
        .from("follow_requests")
        .select(`
            id, status, created_at,
            requester:profiles!follow_requests_requester_id_fkey(id, username, display_name, avatar_url, bio)
        `)
        .eq("target_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    if (requestsError) {
        return jsonError(requestsError.message, 500, requestsError.code);
    }

    return jsonSuccess({ requests: requests || [] });
}

// PUT /api/follow-request/manage
export async function PUT(request: Request) {
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

    if (followRequest.target_id !== userId) {
        return jsonError("Unauthorized", 403);
    }

    if (action === "approve") {
        const { data: followData, error: followError } = await supabase
            .rpc("create_follow", {
                follower_uuid: followRequest.requester_id,
                following_uuid: userId
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
