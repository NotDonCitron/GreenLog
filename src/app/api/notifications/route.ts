import { createServerSupabaseClient } from "@/lib/supabase/server";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function GET() {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return jsonError("Unauthorized", 401);
    }

    const { data: notifications, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

    if (error) {
        return jsonError(error.message, 500, error.code);
    }

    return jsonSuccess({ notifications });
}
