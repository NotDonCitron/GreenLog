import { createServerSupabaseClient } from "@/lib/supabase/server";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const { endpoint, p256dh, auth } = await request.json();

    if (!endpoint || !p256dh || !auth) {
      return jsonError("Missing push subscription data", 400);
    }

    // Upsert subscription (replace if exists for this user+endpoint)
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,endpoint",
      });

    if (error) {
      console.error("Push subscription error:", error);
      return jsonError("Failed to save push subscription", 500, error.code);
    }

    return jsonSuccess({ success: true });
  } catch (err) {
    console.error("Push subscribe error:", err);
    return jsonError("Invalid request body", 400);
  }
}
