import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authHeader = request.headers.get("Authorization");
        const accessToken = authHeader?.replace("Bearer ", "");

        if (!accessToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = decodeToken(accessToken);
        if (!userId) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        });

        const { id: organizationId } = await params;

        // Check if organization exists
        const { data: org, error: orgError } = await supabase
            .from("organizations")
            .select("id, status")
            .eq("id", organizationId)
            .single();

        if (orgError || !org) {
            return NextResponse.json({ error: "not_found" }, { status: 404 });
        }

        if (org.status !== "active") {
            return NextResponse.json({ error: "Organization not active" }, { status: 400 });
        }

        // Check if already a member
        const { data: existingMember } = await supabase
            .from("organization_members")
            .select("id, membership_status")
            .eq("organization_id", organizationId)
            .eq("user_id", userId)
            .single();

        if (existingMember && existingMember.membership_status === "active") {
            return NextResponse.json({ error: "already_member" }, { status: 400 });
        }

        // If invite exists with pending status, activate it; otherwise create new membership
        if (existingMember && existingMember.membership_status === "invited") {
            const { error: updateError } = await supabase
                .from("organization_members")
                .update({ membership_status: "active", joined_at: new Date().toISOString() })
                .eq("id", existingMember.id);

            if (updateError) {
                return NextResponse.json({ error: updateError.message }, { status: 500 });
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
                return NextResponse.json({ error: insertError.message }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Community join error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}