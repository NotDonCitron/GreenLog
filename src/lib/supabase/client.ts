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
    (global as any).location = shimLocation;
}
if (typeof globalThis !== "undefined" && !("location" in globalThis)) {
    (globalThis as any).location = shimLocation;
}

function createSupabaseClientOptions(): any {
    const isBrowser = typeof window !== "undefined";

    return {
        auth: {
            detectSessionInUrl: false,
            autoRefreshToken: isBrowser,
            persistSession: isBrowser,
        },
        global: {
            fetch: (url: string | URL | Request, init?: RequestInit) => fetch(url, init),
        },
        realtime: isBrowser ? undefined : { timeout: 0 },
    };
}

// Lazy initialization - client is only created when first accessed
// This prevents "window is not defined" during Next.js static generation
let lazyClient: SupabaseClient | null = null;

function getClient(): SupabaseClient {
    if (lazyClient) return lazyClient;

    lazyClient = createClient(supabaseUrl, supabaseAnonKey, createSupabaseClientOptions());
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
        realtime: typeof window === "undefined" ? { timeout: 0 } : undefined,
    });
}
