import { jsonSuccess, jsonError } from "@/lib/api-response";
import { sendPushToUser, getSupabaseAdmin } from "@/lib/push";

export async function POST(request: Request) {
    // TEMPORARY: For testing only, create notification for specific user
    const userId = "2d797325-5a17-4620-8b94-a55f338996c1"; // User's UUID

    const supabaseAdmin = getSupabaseAdmin();

    // Create test notification
    const { data: notification, error: insertError } = await supabaseAdmin
        .from("notifications")
        .insert({
            user_id: userId,
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
    await sendPushToUser(supabaseAdmin, userId, {
        title: notification.title,
        body: notification.message,
        tag: notification.type,
        data: notification.data,
    });

    return jsonSuccess({ notification: "Test Benachrichtigung erstellt und Push gesendet" });
}