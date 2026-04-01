import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";

// GET /api/invites/pending
export async function GET(request: Request) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return;
    const { user, supabase } = auth;

    const userEmail = user.email?.toLowerCase();
    if (!userEmail) {
        return jsonError("User email not found", 400);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: invitesError } = await (supabase
        .from("organization_invites") as any)
        .select("*")
        .eq("email", userEmail)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    const typedInvites = (data ?? []) as Array<{
        expires_at: string;
        [key: string]: unknown;
    }>;

    const validInvites = typedInvites.filter((invite) =>
        new Date(invite.expires_at) > new Date()
    );

    if (invitesError) {
        return jsonError("Failed to fetch invites", 500, invitesError.code, invitesError.message);
    }

    return jsonSuccess({ invites: validInvites });
}
