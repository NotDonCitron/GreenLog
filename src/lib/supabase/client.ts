import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "demo-anon-key";

declare global {
    var __greenlogSupabase__: SupabaseClient | undefined;
}

function createSupabaseSingleton(): SupabaseClient {
    return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase =
    typeof window === "undefined"
        ? createSupabaseSingleton()
        : (globalThis.__greenlogSupabase__ ??= createSupabaseSingleton());

// Helper to create an authenticated client with access token
export function getAuthenticatedClient(accessToken: string): SupabaseClient {
    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    });
}
