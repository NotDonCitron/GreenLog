import { getAuthenticatedClient } from "@/lib/supabase/client";
import { createHash, randomBytes } from "crypto";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";

type RouteParams = { params: Promise<{ id: string }> };

function generateInviteToken(): string {
    return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

// POST /api/communities/[id]/invite
export async function POST(request: Request, { params }: RouteParams) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return;
    if (auth instanceof Response) return;
    const { user, supabase } = auth;
    const { id: organizationId } = await params;

    const { data: membership, error: membershipError } = await supabase
        .from("organization_members")
        .select("role, membership_status")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .eq("membership_status", "active")
        .single();

    if (membershipError || !membership) {
        return jsonError("Forbidden", 403);
    }

    if (membership.role !== "gründer") {
        return jsonError("Only the Gründer can invite admins", 403);
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
        return jsonError("email is required", 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return jsonError("Invalid email format", 400);
    }

    await supabase
        .from("organization_invites")
        .update({ status: "revoked" })
        .eq("organization_id", organizationId)
        .eq("email", email.toLowerCase())
        .eq("status", "pending");

    const token = generateInviteToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: invite, error: inviteError } = await supabase
        .from("organization_invites")
        .insert({
            organization_id: organizationId,
            email: email.toLowerCase(),
            role: "admin",
            token_hash: tokenHash,
            expires_at: expiresAt,
            invited_by: user.id,
            status: "pending"
        })
        .select()
        .single();

    if (inviteError) {
        if (inviteError.code === "23505") {
            return jsonError("An invite for this email already exists", 409);
        }
        return jsonError("Failed to create invite", 500, inviteError.code, inviteError.message);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://greenlog.app";
    const inviteUrl = `${baseUrl}/invite/${token}`;

    return jsonSuccess({ inviteUrl }, 201);
}
