import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uwjyvvvykyueuxtdkscs.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

declare global {
    var __greenlogSupabase__: SupabaseClient | undefined;
}

function getClient(): SupabaseClient {
    if (typeof window !== "undefined") {
        if (!globalThis.__greenlogSupabase__) {
            globalThis.__greenlogSupabase__ = createClient(supabaseUrl, supabaseAnonKey, {
                auth: {
                    detectSessionInUrl: true,
                    autoRefreshToken: true,
                    persistSession: true,
                },
            });
        }
        return globalThis.__greenlogSupabase__;
    }

    if (typeof global !== "undefined") {
        const g = global as { __greenlogSupabase__?: SupabaseClient };
        if (!g.__greenlogSupabase__) {
            g.__greenlogSupabase__ = createClient(supabaseUrl, supabaseAnonKey, {
                auth: {
                    detectSessionInUrl: true,
                    autoRefreshToken: true,
                    persistSession: true,
                },
            });
        }
        return g.__greenlogSupabase__;
    }

    return createClient(supabaseUrl, supabaseAnonKey, {});
}

export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        return getClient()[prop as keyof SupabaseClient];
    },
    has(_target, prop) {
        return prop in getClient();
    },
});

export async function getAuthenticatedClient(accessToken: string): Promise<SupabaseClient> {
    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
}
