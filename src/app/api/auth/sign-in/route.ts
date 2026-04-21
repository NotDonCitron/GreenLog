import { jsonError, jsonSuccess } from "@/lib/api-response";
import type { NextRequest } from "next/server";

const SUPABASE_AUTH_TIMEOUT_MS = 12_000;

function isAbortError(error: unknown) {
    return (
        error instanceof Error
            ? error.name === "AbortError"
            : typeof error === "object" &&
              error !== null &&
              "name" in error &&
              error.name === "AbortError"
    );
}

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();
        if (!email || !password) {
            return jsonError("E-Mail und Passwort erforderlich", 400);
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

        if (!supabaseUrl || !supabaseAnonKey) {
            return jsonError("Supabase-Konfiguration fehlt", 500);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SUPABASE_AUTH_TIMEOUT_MS);

        try {
            const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
                method: "POST",
                headers: {
                    apikey: supabaseAnonKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
                cache: "no-store",
                signal: controller.signal,
            });

            const payload = await response.json().catch(() => null) as {
                access_token?: string;
                refresh_token?: string;
                expires_in?: number;
                expires_at?: number;
                token_type?: string;
                user?: Record<string, unknown> | null;
                error_description?: string;
                msg?: string;
            } | null;

            if (!response.ok) {
                const message =
                    payload?.error_description ||
                    payload?.msg ||
                    "Anmeldung fehlgeschlagen";
                const status = response.status === 400 ? 401 : response.status;
                return jsonError(message, status);
            }

            if (!payload?.access_token || !payload?.refresh_token) {
                return jsonError("Ungültige Auth-Antwort", 502);
            }

            return jsonSuccess({
                user: payload.user ?? null,
                session: {
                    access_token: payload.access_token,
                    refresh_token: payload.refresh_token,
                    expires_in: payload.expires_in,
                    expires_at: payload.expires_at,
                    token_type: payload.token_type,
                    user: payload.user ?? null,
                },
            });
        } finally {
            clearTimeout(timeoutId);
        }
    } catch (err) {
        console.error("[API /auth/sign-in]", err);
        if (isAbortError(err)) {
            return jsonError("Auth service timeout", 504);
        }
        return jsonError("Serverfehler", 500);
    }
}
