import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Standardized API response helpers.
 * All API routes should use these for consistent error/success formatting.
 */

export type ApiError = {
  message: string;
  code?: string;
  details?: unknown;
};

export type SuccessResponse<T> = {
  data: T;
  error: null;
};

export type ErrorResponse = {
  data: null;
  error: ApiError;
};

export function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json<SuccessResponse<T>>({ data, error: null }, { status });
}

export function jsonError(
  message: string,
  status = 500,
  code?: string,
  details?: unknown
) {
  return NextResponse.json<ErrorResponse>(
    { data: null, error: { message, code, details } },
    { status }
  );
}

/**
 * Extract and validate Bearer token from Authorization header.
 */
export function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  return token?.trim() || null;
}

/**
 * Authenticate a request and return the user + supabase client.
 * Returns null if authentication failed (response already sent).
 */
export async function authenticateRequest(
  request: Request,
  getClient: (token: string) => SupabaseClient
): Promise<{ user: { id: string; email?: string }; supabase: SupabaseClient } | null> {
  const token = getBearerToken(request);
  if (!token) {
    jsonError("Unauthorized", 401);
    return null;
  }

  const supabase = getClient(token);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    jsonError("Unauthorized", 401);
    return null;
  }

  return { user, supabase };
}
