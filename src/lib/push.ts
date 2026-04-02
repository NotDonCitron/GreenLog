import webpush from "web-push";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Initialize VAPID - requires environment variables:
// VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.NEXT_PUBLIC_SITE_URL || "mailto:admin@greenlog.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
}

export async function sendPushToUser(
  supabaseAdmin: SupabaseClient,
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[Push] VAPID keys not configured - skipping push");
    return { sent: 0, failed: 0 };
  }

  // Fetch all push subscriptions for this user
  const { data: subscriptions, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subscriptions?.length) {
    return { sent: 0, failed: 0 };
  }

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    tag: payload.tag || "default",
    data: payload.data || {},
    actions: payload.actions || [],
  });

  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          pushPayload
        );
        sent++;
      } catch (err: unknown) {
        const pushError = err as { statusCode?: number };
        // 410 Gone = subscription expired, delete it
        if (pushError.statusCode === 410) {
          await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
        failed++;
      }
    })
  );

  return { sent, failed };
}

// Create a Supabase admin client for push operations
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(`getSupabaseAdmin: SUPABASE_SERVICE_ROLE_KEY is missing! URL=${!!url}, KEY=${!!serviceKey}`);
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
