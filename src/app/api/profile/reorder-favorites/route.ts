import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";

// PATCH /api/profile/reorder-favorites
// relationIds are strain_ids (user_strain_relations has composite PK user_id+strain_id, no id column)
export async function PATCH(request: Request) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return;
    if (auth instanceof Response) return;
    const { user, supabase } = auth;

    const body = await request.json();
    const { relationIds } = body;

    if (!Array.isArray(relationIds) || relationIds.length === 0) {
        return jsonError("relationIds array is required", 400);
    }

    const updates = relationIds.map((strainId: string, index: number) =>
        supabase
            .from("user_strain_relations")
            .update({ position: index })
            .eq("strain_id", strainId)
            .eq("user_id", user.id)
            .eq("is_favorite", true)
    );

    await Promise.all(updates);

    return jsonSuccess({ success: true });
}
