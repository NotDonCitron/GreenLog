import { createClient } from "@supabase/supabase-js";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import type { NextRequest } from "next/server";

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

        // Use a fresh stateless client for password sign-in.
        // Reusing the cookie-aware server client can stall auth requests locally.
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
        });

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            return jsonError(error.message, 401);
        }

        return jsonSuccess({ user: data.user, session: data.session });
    } catch (err) {
        console.error("[API /auth/sign-in]", err);
        return jsonError("Serverfehler", 500);
    }
}
