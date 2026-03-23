import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function POST(
    request: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const authHeader = request.headers.get("Authorization");
        const accessToken = authHeader?.replace("Bearer ", "");

        if (!accessToken) {
            return NextResponse.json({ error: "Unauthorized - no token" }, { status: 401 });
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

        const { userId: targetId } = await params;
        const requesterId = userId;

        // Can't follow yourself
        if (requesterId === targetId) {
            return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
        }

        // Check if target user exists and is private
        const { data: targetProfile, error: profileError } = await supabase
            .from("profiles")
            .select("profile_visibility")
            .eq("id", targetId)
            .single();

        if (profileError || !targetProfile) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if already following
        const { data: existingFollow } = await supabase
            .from("follows")
            .select("id")
            .eq("follower_id", requesterId)
            .eq("following_id", targetId)
            .single();

        if (existingFollow) {
            return NextResponse.json({ error: "Already following" }, { status: 400 });
        }

        // If profile is public, create follow directly
        if (targetProfile.profile_visibility === "public") {
            const { error: followError } = await supabase
                .from("follows")
                .insert({ follower_id: requesterId, following_id: targetId });

            if (followError) {
                return NextResponse.json({ error: followError.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, action: "followed" });
        }

        // Private profile - create follow request
        // Check if request already exists
        const { data: existingRequest } = await supabase
            .from("follow_requests")
            .select("id, status")
            .eq("requester_id", requesterId)
            .eq("target_id", targetId)
            .single();

        if (existingRequest) {
            if (existingRequest.status === "pending") {
                return NextResponse.json({ error: "Request already pending" }, { status: 400 });
            }
            if (existingRequest.status === "rejected") {
                // Allow re-request after rejection
                const { error: updateError } = await supabase
                    .from("follow_requests")
                    .update({ status: "pending", created_at: new Date().toISOString() })
                    .eq("id", existingRequest.id);

                if (updateError) {
                    return NextResponse.json({ error: updateError.message }, { status: 500 });
                }
                return NextResponse.json({ success: true, action: "request_sent" });
            }
            if (existingRequest.status === "approved") {
                // Create the follow now
                const { error: followError } = await supabase
                    .from("follows")
                    .insert({ follower_id: requesterId, following_id: targetId });

                if (followError) {
                    return NextResponse.json({ error: followError.message }, { status: 500 });
                }
                return NextResponse.json({ success: true, action: "followed" });
            }
        }

        // Create new follow request
        const { error: requestError } = await supabase
            .from("follow_requests")
            .insert({ requester_id: requesterId, target_id: targetId, status: "pending" });

        if (requestError) {
            return NextResponse.json({ error: requestError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, action: "request_sent" });
    } catch (error) {
        console.error("Follow request error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
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

        const { userId: targetId } = await params;
        const requesterId = userId;

        // Cancel follow request if exists
        const { error: deleteError } = await supabase
            .from("follow_requests")
            .delete()
            .eq("requester_id", requesterId)
            .eq("target_id", targetId)
            .eq("status", "pending");

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Cancel follow request error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
