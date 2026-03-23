import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Helper to decode JWT and get user ID without API call
function decodeToken(token: string): string | null {
    try {
        const payload = token.split(".")[1];
        const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
        return decoded.sub || null;
    } catch {
        return null;
    }
}

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        const accessToken = authHeader?.replace("Bearer ", "");

        if (!accessToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Decode token to get user ID (avoids API call for auth verification)
        const userId = decodeToken(accessToken);
        if (!userId) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // Create supabase client with the token for RLS
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        });

        // Get pending follow requests targeting this user
        const { data: requests, error: requestsError } = await supabase
            .from("follow_requests")
            .select(`
                id,
                status,
                created_at,
                requester:profiles!follow_requests_requester_id_fkey(
                    id,
                    username,
                    display_name,
                    avatar_url,
                    bio
                )
            `)
            .eq("target_id", userId)
            .eq("status", "pending")
            .order("created_at", { ascending: false });

        if (requestsError) {
            return NextResponse.json({ error: requestsError.message }, { status: 500 });
        }

        return NextResponse.json({ requests: requests || [] });
    } catch (error) {
        console.error("Get follow requests error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        const accessToken = authHeader?.replace("Bearer ", "");

        if (!accessToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Decode token to get user ID
        const userId = decodeToken(accessToken);
        if (!userId) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // Create supabase client with the token
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        });

        const body = await request.json();
        const { requestId, action } = body;

        if (!requestId || !action || !["approve", "reject"].includes(action)) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        // Get the follow request
        const { data: followRequest, error: getError } = await supabase
            .from("follow_requests")
            .select("requester_id, target_id, status")
            .eq("id", requestId)
            .single();

        if (getError || !followRequest) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        // Only target user can approve/reject
        if (followRequest.target_id !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        if (action === "approve") {
            // Create the follow relationship
            // Using the new policy that allows profile owners to insert follows where they are the target
            const { error: followError } = await supabase
                .from("follows")
                .insert({
                    follower_id: followRequest.requester_id,
                    following_id: userId
                });

            if (followError) {
                console.error("Follow insert error:", followError);
                return NextResponse.json({ error: followError.message, code: followError.code }, { status: 500 });
            }

            // Update request status to approved
            const { error: updateError } = await supabase
                .from("follow_requests")
                .update({ status: "approved" })
                .eq("id", requestId);

            if (updateError) {
                console.error("Update request error:", updateError);
                return NextResponse.json({ error: updateError.message, code: updateError.code }, { status: 500 });
            }

            return NextResponse.json({ success: true, action: "approved" });
        } else {
            // Reject the request
            const { error: updateError } = await supabase
                .from("follow_requests")
                .update({ status: "rejected" })
                .eq("id", requestId);

            if (updateError) {
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, action: "rejected" });
        }
    } catch (error) {
        console.error("Manage follow request error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
