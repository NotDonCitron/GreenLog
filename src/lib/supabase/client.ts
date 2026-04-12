import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "demo-anon-key";

declare global {
    var __greenlogSupabase__: SupabaseClient | undefined;
}

// Shim browser globals for libraries that access them during SSR/build initialization
// This MUST be set before any Supabase client is created
const shimLocation = {
    protocol: "https:",
    host: "localhost",
    href: "http://localhost",
    origin: "http://localhost",
    pathname: "/",
    search: "",
    hash: ""
};
if (typeof global !== "undefined" && !("location" in global)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).location = shimLocation;
}
if (typeof globalThis !== "undefined" && !("location" in globalThis)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).location = shimLocation;
}

function createSupabaseClientOptions() {
    const isBrowser = typeof window !== "undefined";

    return {
        auth: {
            detectSessionInUrl: false,
            autoRefreshToken: false,
            persistSession: false,
        },
        global: {
            fetch: async (url: string | URL | Request, init?: RequestInit) => {
                const headers = new Headers(init?.headers);
                if (typeof window !== "undefined") {
                    try {
                        const Clerk = (window as any).Clerk;
                        if (Clerk && Clerk.session) {
                            // Clerk Supabase native integration - no template needed
                            const token = await Clerk.session.getToken();
                            if (token) {
                                headers.set('Authorization', `Bearer ${token}`);
                            }
                        }
                    } catch (e) {
                        console.warn("[Supabase Client] Failed to get Clerk token:", e);
                    }
                }
                return fetch(url, { ...init, headers });
            },
        },
        realtime: isBrowser ? undefined : { timeout: 0 },
    };
}

// Lazy initialization - client is only created when first accessed
function getClient(): SupabaseClient {
    if (typeof window !== "undefined") {
        if (!globalThis.__greenlogSupabase__) {
            globalThis.__greenlogSupabase__ = createClient(supabaseUrl, supabaseAnonKey, createSupabaseClientOptions());
        }
        return globalThis.__greenlogSupabase__;
    }

    if (typeof global !== "undefined") {
        const g = global as any;
        if (!g.__greenlogSupabase__) {
            g.__greenlogSupabase__ = createClient(supabaseUrl, supabaseAnonKey, createSupabaseClientOptions());
        }
        return g.__greenlogSupabase__;
    }

    return createClient(supabaseUrl, supabaseAnonKey, createSupabaseClientOptions());
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
export async function getAuthenticatedClient(accessToken: string): Promise<SupabaseClient> {
    const key = supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    if (!key) {
        throw new Error(`Supabase anon key is missing! URL=${url}, KEY=${JSON.stringify(key)}, ENV=${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)}`);
    }
    const client = createClient(url, key, {
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
        realtime: typeof window === "undefined" ? { timeout: 0 } : undefined,
    });

    // With Clerk, we don't need (and cannot use) setSession because it attempts
    // to verify the token with GoTrue API which doesn't have the user.
    // The Authorization header above is sufficient for all RLS database queries.

    return client;
}
