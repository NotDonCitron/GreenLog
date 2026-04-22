import { NextResponse } from "next/server";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { sendPushToUser, getSupabaseAdmin } from "@/lib/push";
import { isAppAdmin } from "@/lib/auth";
import { CONTACT_EMAIL, PUBLIC_SITE_URL } from "@/lib/site-config";

export async function GET(request: Request) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    if (!isAppAdmin(user.id)) {
        return jsonError("Forbidden", 403);
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    const adminClient = getSupabaseAdmin();

    if (userId === "all_subs") {
        const { data: subs, error: subError } = await adminClient
            .from("push_subscriptions")
            .select("user_id, endpoint")
            .limit(50);
        return jsonSuccess({ subscriptions: subs, error: subError });
    }

    if (!userId) {
        return jsonError("user_id is required", 400);
    }

    const { data, error } = await adminClient
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

    if (error) {
        return jsonError(error.message, 500);
    }

    return jsonSuccess({ notifications: data });
}

export async function POST(request: Request) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    if (!isAppAdmin(user.id)) {
        return jsonError("Forbidden", 403);
    }

    let body: Record<string, unknown> = {};
    try {
        body = await request.json();
    } catch {
        // empty body is ok
    }

    const targetUserId = (body.user_id as string) || user.id;

    if (!targetUserId) {
        return jsonError("Unauthorized or no target user_id provided", 401);
    }

    let type = body.type || "test";
    let title = "Test Benachrichtigung";
    let message = "Das ist ein Test für alle Benachrichtigungsfunktionen. Sie sollten diese Push-Benachrichtigung erhalten haben.";
    let data: Record<string, any> = { test: true };

    switch (type) {
        case "new_follower":
            title = "Neuer Follower!";
            message = "Jemand hat angefangen dir zu folgen.";
            break;
        case "follow_request":
            title = "Neue Follow-Anfrage";
            message = "Ein Benutzer möchte dir folgen. Bestätige die Anfrage in deinem Profil.";
            break;
        case "badge_unlocked":
            title = "Abzeichen freigeschaltet! 🏆";
            message = "Herzlichen Glückwunsch! Du hast ein neues Abzeichen erhalten.";
            data = { badge_id: "test-badge" };
            break;
        case "strain_review":
            title = "Neue Bewertung für deine Sorte";
            message = "Ein Benutzer hat eine Bewertung für eine deiner Sorten hinterlassen.";
            data = { strain_id: "test-strain" };
            break;
    }

    // Use admin client for DB operations
    const adminClient = getSupabaseAdmin();

    // Create test notification
    const { data: notification, error: insertError } = await adminClient
        .from("notifications")
        .insert({
            user_id: targetUserId,
            title: title,
            message: message,
            type: type,
            read: false,
            data: data
        })
        .select()
        .single();

    if (insertError) {
        return jsonError(insertError.message, 500);
    }
// Send push notification
let pushResult = { sent: 0, failed: 0 };
if (body.subscription) {
    // Direct test with provided subscription
    const webpush = require("web-push");
    const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
    let VAPID_SUBJECT = PUBLIC_SITE_URL;

    // VAPID subject must be mailto: or https:
    if (!VAPID_SUBJECT.startsWith("mailto:") && !VAPID_SUBJECT.startsWith("https:")) {
        VAPID_SUBJECT = `mailto:${CONTACT_EMAIL}`;
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    try {
        await webpush.sendNotification(
            body.subscription,
            JSON.stringify({
                title: notification.title,
                body: notification.message,
                tag: notification.type,
                data: notification.data,
            })
        );
        pushResult.sent = 1;
    } catch (err) {
        console.error("Manual push failed:", err);
        pushResult.failed = 1;
    }
} else {
    pushResult = await sendPushToUser(adminClient, targetUserId, {
        title: notification.title,
        body: notification.message,
        tag: notification.type,
        data: notification.data,
    });
}
    return jsonSuccess({ 
        notification: "Test Benachrichtigung erstellt und Push gesendet",
        type: type,
        targetUserId: targetUserId,
        pushResult: pushResult
    });
}
