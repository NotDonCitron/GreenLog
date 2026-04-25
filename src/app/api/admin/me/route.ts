import { NextResponse } from "next/server";
import { authenticateRequest, jsonSuccess } from "@/lib/api-response";
import { isAppAdmin } from "@/lib/auth";
import { getAuthenticatedClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof NextResponse) return auth;

  return jsonSuccess({ isAdmin: isAppAdmin(auth.user.id) });
}
