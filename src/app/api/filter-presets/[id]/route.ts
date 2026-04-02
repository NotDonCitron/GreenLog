import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { getAuthenticatedClient } from "@/lib/supabase/client";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof Response) return auth;

  const { id } = await params;

  // Check if preset exists and user is the owner
  const { data: preset, error: fetchError } = await auth.supabase
    .from("filter_presets")
    .select("user_id")
    .eq("id", id)
    .single();

  if (fetchError || !preset) {
    return jsonError("Preset not found", 404);
  }

  if (preset.user_id !== auth.user.id) {
    return jsonError("Forbidden", 403);
  }

  const { error: deleteError } = await auth.supabase
    .from("filter_presets")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return jsonError("Failed to delete preset", 500);
  }

  return jsonSuccess({ id }, 200);
}
