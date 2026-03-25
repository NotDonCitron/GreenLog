import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "demo-anon-key";

declare global {
    var __greenlogSupabase__: SupabaseClient | undefined;
}

// Detect server environment
const isServer = typeof window === "undefined";

// Shim browser globals for libraries that access them during SSR/build initialization
if (isServer) {
    const shim = {
        protocol: "https:",
        host: "localhost",
        href: "http://localhost",
        origin: "http://localhost",
        pathname: "/",
        search: "",
        hash: ""
    };
    if (!(global as any).location) (global as any).location = shim;
}

// detectSessionInUrl reads `window.location` at init time; disabling it prevents
// the "location is not defined" SSR/build crash. autoRefreshToken is also unsafe
// on the server since there is no persistent session context there.
function createSupabaseSingleton(): SupabaseClient {
    const options: any = {
        auth: {
            detectSessionInUrl: false,
            autoRefreshToken: !isServer,
            persistSession: !isServer,
        },
        global: {
            fetch: (url: string | URL | Request, init?: RequestInit) => fetch(url, init),
        },
    };

    // On server, we can't really "disable" realtime via a boolean, 
    // but we can pass an empty object or dummy values if needed.
    // The location shim above is the primary fix for the crash.
    if (isServer) {
        options.realtime = {
            timeout: 0,
        };
    }

    return createClient(supabaseUrl, supabaseAnonKey, options);
}

// On the server (SSR / build), create a fresh client per invocation so that
// no module-level singleton captures server state between requests.
// On the browser, reuse a single instance across the app lifetime.
export const supabase: SupabaseClient =
    isServer
        ? createSupabaseSingleton()
        : (globalThis.__greenlogSupabase__ ??= createSupabaseSingleton());

// Helper to create an authenticated client with access token
export function getAuthenticatedClient(accessToken: string): SupabaseClient {
    const options: any = {
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
    };

    if (isServer) {
        options.realtime = {
            timeout: 0,
        };
    }

    return createClient(supabaseUrl, supabaseAnonKey, options);
}
