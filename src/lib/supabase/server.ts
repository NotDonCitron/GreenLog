import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function createServerSupabaseClient(): Promise<SupabaseClient> {
    const cookieStore = await cookies();

    // Get the Supabase auth cookies
    const accessToken = cookieStore.get("sb-access-token")?.value;
    const refreshToken = cookieStore.get("sb-refresh-token")?.value;

    const options: Parameters<typeof createClient>[2] = {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    };

    // If we have tokens, pass them via cookie header
    if (accessToken) {
        options.global = {
            headers: {
                Cookie: `sb-access-token=${accessToken};sb-refresh-token=${refreshToken || ""}`,
            },
        };
    }

    return createClient(supabaseUrl, supabaseAnonKey, options);
}
