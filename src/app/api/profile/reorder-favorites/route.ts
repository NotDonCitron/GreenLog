import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";

// PATCH /api/profile/reorder-favorites
export async function PATCH(request: Request) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return;
    const { user, supabase } = auth;

    const body = await request.json();
    const { relationIds } = body;

    if (!Array.isArray(relationIds) || relationIds.length === 0) {
        return jsonError("relationIds array is required", 400);
    }

    const updates = relationIds.map((relationId: string, index: number) =>
        supabase
            .from("user_strain_relations")
            .update({ position: index })
            .eq("id", relationId)
            .eq("user_id", user.id)
            .eq("is_favorite", true)
    );

    await Promise.all(updates);

    return jsonSuccess({ success: true });
}
