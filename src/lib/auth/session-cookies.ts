import type { Session } from "@supabase/supabase-js";

const ACCESS_COOKIE = "sb-access-token";
const REFRESH_COOKIE = "sb-refresh-token";

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function syncSupabaseSessionCookies(session: Session | null) {
  if (!session?.access_token) {
    clearCookie(ACCESS_COOKIE);
    clearCookie(REFRESH_COOKIE);
    return;
  }

  const expiresIn = Math.max(60, session.expires_in ?? 60 * 60);
  setCookie(ACCESS_COOKIE, session.access_token, expiresIn);

  if (session.refresh_token) {
    setCookie(REFRESH_COOKIE, session.refresh_token, 60 * 60 * 24 * 30);
  }
}
