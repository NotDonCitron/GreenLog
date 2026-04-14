import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Clerk server-side auth
async function getClerkToken(): Promise<string | null> {
    try {
        const { auth } = await import("@clerk/nextjs/server");
        const { getToken } = await auth();
        if (getToken) {
            return await getToken();
        }
    } catch {
        // Clerk not available in this context
    }
    return null;
}

export async function createServerSupabaseClient(): Promise<SupabaseClient> {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("sb-access-token")?.value;
    const refreshToken = cookieStore.get("sb-refresh-token")?.value;

    // Try Clerk token for RLS auth
    const clerkToken = await getClerkToken();

    const options: Parameters<typeof createClient>[2] = {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    };

    if (accessToken) {
        options.global = {
            headers: {
                Cookie: `sb-access-token=${accessToken};sb-refresh-token=${refreshToken || ""}`,
            },
        };
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, options);

    // Inject Clerk token into requests if available (for RLS in Server Components)
    if (clerkToken) {
        try {
            const globals = (client as any).globals;
            if (globals && typeof globals.fetch === 'function') {
                const originalFetch = globals.fetch.bind(globals);
                globals.fetch = (url: string | URL | Request, init?: RequestInit) => {
                    const headers = new Headers(init?.headers || {});
                    headers.set('Authorization', `Bearer ${clerkToken}`);
                    return originalFetch(url, { ...init, headers } as RequestInit);
                };
            }
        } catch {
            //globals.fetch not available in this supabase-js version — skip
        }
    }

    return client;
}
