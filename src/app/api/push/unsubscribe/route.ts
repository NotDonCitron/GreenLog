import { createServerSupabaseClient } from "@/lib/supabase/server";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const { endpoint } = await request.json();

    if (!endpoint) {
      return jsonError("Missing endpoint", 400);
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);

    if (error) {
      return jsonError("Failed to remove push subscription", 500, error.code);
    }

    return jsonSuccess({ success: true });
  } catch (err) {
    return jsonError("Invalid request body", 400);
  }
}
