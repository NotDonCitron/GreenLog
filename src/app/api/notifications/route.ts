import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { sendPushToUser, getSupabaseAdmin } from "@/lib/push";

export async function GET(request: Request) {
    const authHeader = request.headers.get("Authorization");
    let supabase;
    if (authHeader) {
        supabase = await getAuthenticatedClient(authHeader.replace("Bearer ", ""));
    } else {
        supabase = await createServerSupabaseClient();
    }

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

    // Send push notifications for unread, unpushed notifications
    const unpushed = notifications?.filter(n => !n.read && !n.pushed_at) || [];
    if (unpushed.length > 0) {
        const supabaseAdmin = getSupabaseAdmin();
        // Send pushes in parallel (max 3 at a time)
        const toPush = unpushed.reverse().slice(-3); // oldest first, max 3
        await Promise.all(toPush.map(notif =>
            sendPushToUser(supabaseAdmin, user.id, {
                title: notif.title,
                body: notif.message || "Neue Benachrichtigung",
                tag: notif.type,
                data: notif.data || {},
            }).catch(pushErr => {
                console.error(`[Push] Failed to send notification ${notif.id}:`, pushErr);
            })
        ));
        // Mark as pushed (bulk update)
        const ids = toPush.map(n => n.id);
        await supabaseAdmin
            .from("notifications")
            .update({ pushed_at: new Date().toISOString() })
            .in("id", ids)
            .eq("user_id", user.id);
    }

    return jsonSuccess({ notifications });
}
