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

    // Supabase's getUser() uses internal session storage, not Authorization header.
    // We must call setSession() to properly set the session so getUser() works.
    // The refresh_token is optional for getUser() to work.
    await client.auth.setSession({
        access_token: accessToken,
        refresh_token: "",
    } as { access_token: string; refresh_token: string });

    return client;
}
