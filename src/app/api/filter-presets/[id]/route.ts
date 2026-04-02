import { createServerSupabaseClient } from "@/lib/supabase/server";
import { jsonSuccess, jsonError } from "@/lib/api-response";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: RouteParams) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await params;

  // Check if preset exists and user is the owner
  const { data: preset, error: fetchError } = await supabase
    .from("filter_presets")
    .select("user_id")
    .eq("id", id)
    .single();

  if (fetchError || !preset) {
    return jsonError("Preset not found", 404);
  }

  if (preset.user_id !== user.id) {
    return jsonError("Forbidden", 403);
  }

  const { error: deleteError } = await supabase
    .from("filter_presets")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return jsonError("Failed to delete preset", 500);
  }

  return jsonSuccess({ id }, 200);
}
