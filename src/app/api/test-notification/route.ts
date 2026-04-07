import { createServerSupabaseClient } from "@/lib/supabase/server";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { sendPushToUser, getSupabaseAdmin } from "@/lib/push";

export async function POST(request: Request) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return jsonError("Unauthorized", 401);
    }

    // Create test notification
    const { data: notification, error: insertError } = await supabase
        .from("notifications")
        .insert({
            user_id: user.id,
            title: "Test Benachrichtigung",
            message: "Das ist ein Test für alle Benachrichtigungsfunktionen. Sie sollten diese Push-Benachrichtigung erhalten haben.",
            type: "test",
            read: false,
            data: { test: true }
        })
        .select()
        .single();

    if (insertError) {
        return jsonError(insertError.message, 500);
    }

    // Send push notification
    const supabaseAdmin = getSupabaseAdmin();
    await sendPushToUser(supabaseAdmin, user.id, {
        title: notification.title,
        body: notification.message,
        tag: notification.type,
        data: notification.data,
    });

    return jsonSuccess({ notification: "Test Benachrichtigung erstellt und Push gesendet" });
}