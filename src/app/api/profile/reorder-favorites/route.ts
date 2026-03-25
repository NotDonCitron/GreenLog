import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";

type RouteParams = { params: Promise<{ [key: string]: string }> };

// PATCH /api/profile/reorder-favorites
// Reorder user's favorite strains by updating their position values
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const authHeader = request.headers.get("Authorization");
        const accessToken = authHeader?.replace("Bearer ", "");

        if (!accessToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getAuthenticatedClient(accessToken);

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { relationIds } = body;

        if (!Array.isArray(relationIds) || relationIds.length === 0) {
            return NextResponse.json({ error: "relationIds array is required" }, { status: 400 });
        }

        // Update each relation's position based on its index in the array
        const updates = relationIds.map((relationId, index) =>
            supabase
                .from("user_strain_relations")
                .update({ position: index })
                .eq("id", relationId)
                .eq("user_id", user.id)
                .eq("is_favorite", true)
        );

        await Promise.all(updates);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
