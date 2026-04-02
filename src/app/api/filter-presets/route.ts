import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { getAuthenticatedClient } from "@/lib/supabase/client";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof Response) return auth;

  const { data, error } = await auth.supabase
    .from("filter_presets")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return jsonError("Failed to fetch presets", 500);
  }

  return jsonSuccess(data);
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof Response) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const { name, effects, flavors, thc_min, thc_max, cbd_min, cbd_max } = body as {
    name?: string;
    effects?: string[];
    flavors?: string[];
    thc_min?: number;
    thc_max?: number;
    cbd_min?: number;
    cbd_max?: number;
  };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return jsonError("Name is required", 400);
  }

  const trimmedName = name.trim().slice(0, 50);

  const { data, error } = await auth.supabase
    .from("filter_presets")
    .insert({
      user_id: auth.user.id,
      name: trimmedName,
      effects: effects || [],
      flavors: flavors || [],
      thc_min: thc_min ?? 0,
      thc_max: thc_max ?? 100,
      cbd_min: cbd_min ?? 0,
      cbd_max: cbd_max ?? 100,
    })
    .select()
    .single();

  if (error) {
    return jsonError("Failed to create preset", 500);
  }

  return jsonSuccess(data, 201);
}