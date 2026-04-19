import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export function buildServerSupabaseClientOptions(
    accessToken?: string,
    refreshToken?: string
): Parameters<typeof createClient>[2] {
    const options: Parameters<typeof createClient>[2] = {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    };

    if (accessToken) {
        options.global = {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Cookie: `sb-access-token=${accessToken};sb-refresh-token=${refreshToken || ""}`,
            },
        };
    }

    return options;
}

export async function createServerSupabaseClient(): Promise<SupabaseClient> {
    const cookieStore = await cookies();

    // Get the Supabase auth cookies
    const accessToken = cookieStore.get("sb-access-token")?.value;
    const refreshToken = cookieStore.get("sb-refresh-token")?.value;
    const options = buildServerSupabaseClientOptions(accessToken, refreshToken);

    return createClient(supabaseUrl, supabaseAnonKey, options);
}
