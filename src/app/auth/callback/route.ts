import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    // Fallback: let the browser client handle code exchange (PKCE/local state).
    const browserFallbackUrl = new URL(`${origin}/sign-in`);
    searchParams.forEach((value, key) => {
      browserFallbackUrl.searchParams.set(key, value);
    });
    browserFallbackUrl.searchParams.set("oauth_error", "callback_exchange_failed");
    return NextResponse.redirect(browserFallbackUrl.toString());
  }

  // No code in callback: route user to sign-in with a clear state instead of a dead-end URL.
  const signInUrl = new URL(`${origin}/sign-in`);
  signInUrl.searchParams.set("oauth_error", "callback_code_missing");
  return NextResponse.redirect(signInUrl.toString());
}
