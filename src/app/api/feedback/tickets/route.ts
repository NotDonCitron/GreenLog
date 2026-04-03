import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import type { SupabaseClient } from "@supabase/supabase-js";

const ALLOWED_CREATOR_IDS = (
    process.env.FEEDBACK_ALLOWED_CREATOR_IDS || ""
).split(",").map(id => id.trim()).filter(Boolean);

async function getUserFromRequest(request: Request): Promise<SupabaseClient | null> {
    const authHeader = request.headers.get("Authorization");
    const accessToken = authHeader?.replace("Bearer ", "");
    if (!accessToken) return null;
    return await getAuthenticatedClient(accessToken);
}

export async function POST(req: Request) {
    try {
        const { title, description, category, priority, page_url, context } = await req.json();

        const supabase = await getUserFromRequest(req);
        if (!supabase) {
            return jsonError("Nicht eingeloggt", 401);
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return jsonError("Nicht eingeloggt", 401);
        }

        if (!ALLOWED_CREATOR_IDS.includes(user.id)) {
            return jsonError("Du hast keine Berechtigung, Tickets zu erstellen.", 403);
        }

        if (!title?.trim() || !description?.trim()) {
            return jsonError("Titel und Beschreibung sind erforderlich.", 400);
        }

        const { data, error } = await supabase
            .from("feedback_tickets")
            .insert({
                user_id: user.id,
                title: title.trim(),
                description: description.trim(),
                category: category || "bug",
                priority: priority || "medium",
                page_url: page_url || null,
                context: context || {},
            })
            .select()
            .single();

        if (error) {
            return jsonError("Fehler beim Erstellen des Tickets.", 500, error.code, error.message);
        }

        return jsonSuccess(data, 201);

    } catch (err) {
        console.error("POST /api/feedback/tickets error:", err);
        return jsonError("Server-Fehler", 500);
    }
}

export async function GET(req: Request) {
    try {
        const supabase = await getUserFromRequest(req);
        if (!supabase) {
            return jsonError("Nicht eingeloggt", 401);
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return jsonError("Nicht eingeloggt", 401);
        }

        const { data, error } = await supabase
            .from("feedback_tickets")
            .select(`
                *,
                profiles!feedback_tickets_user_id_fkey(username),
                ticket_approvals(user_id)
            `)
            .order("created_at", { ascending: false });

        if (error) {
            return jsonError("Fehler beim Laden der Tickets.", 500, error.code, error.message);
        }

        return jsonSuccess(data);

    } catch (err) {
        console.error("GET /api/feedback/tickets error:", err);
        return jsonError("Server-Fehler", 500);
    }
}
