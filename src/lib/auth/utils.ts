// JWT helper utilities for CannaLOG API routes.
// All authentication MUST go through supabase.auth.getUser() via authenticateRequest().
// Never decode JWTs manually – signature verification is required for security.

/**
 * Validate that a string looks like a Supabase JWT (three base64 segments).
 * This does NOT verify the signature – use authenticateRequest() for that.
 */
export function isValidJwtFormat(token: string): boolean {
    const parts = token.split(".");
    return parts.length === 3 && parts.every((part) => part.length > 0);
}
