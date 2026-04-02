import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "demo-anon-key";

declare global {
    var __greenlogSupabase__: SupabaseClient | undefined;
}

// Lazy initialization - client is only created when first accessed
// This prevents issues during SSR / Vercel build when env vars aren't yet inlined
let lazyClient: SupabaseClient | null = null;

function getClient(): SupabaseClient {
    if (lazyClient) return lazyClient;
    lazyClient = createClient(supabaseUrl, supabaseAnonKey);
    return lazyClient;
}

// Proxy-based lazy client - all property accesses forward to the real client
// This allows `supabase.from(...)` to work without triggering client creation at import time
export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        return getClient()[prop as keyof SupabaseClient];
    },
    has(_target, prop) {
        return prop in getClient();
    },
});

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
