/**
 * Sentry Consent Management — DISABLED
 *
 * Sentry has been temporarily disabled due to a build conflict
 * with Vercel Turbopack (ENOENT middleware.js.nft.json).
 *
 * These are no-op stubs so existing imports don't break.
 * Re-enable once @sentry/nextjs supports Turbopack middleware.
 */

export async function enableSentryAfterConsent(): Promise<void> {
  // no-op: Sentry disabled
}

export async function disableSentryAfterRevoke(): Promise<void> {
  // no-op: Sentry disabled
}

/**
 * Sync analytics consent to Supabase (for logged-in users).
 * This function is independent of Sentry and remains functional.
 */
export async function syncAnalyticsConsentToSupabase(_userId: string): Promise<void> {
  try {
    await fetch('/api/gdpr/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent_type: 'analytics', granted: true }),
    });
  } catch {
    // Silent – sync failure shouldn't break UX
  }
}
