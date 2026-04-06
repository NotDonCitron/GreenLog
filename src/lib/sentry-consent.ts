/**
 * Sentry Consent Management
 *
 * Handles enabling/disabling Sentry based on user consent.
 * Sentry is pre-initialized as disabled via sentry.client.config.ts.
 * These functions activate/deactivate it after user consent.
 */

export async function enableSentryAfterConsent(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;

  try {
    const { isEnabled, enable } = await import('@sentry/browser');
    if (!isEnabled()) {
      enable();
    }
  } catch (err) {
    console.warn('[Sentry] Failed to enable after consent:', err);
  }
}

export async function disableSentryAfterRevoke(): Promise<void> {
  try {
    const { disable } = await import('@sentry/browser');
    disable();
  } catch (err) {
    console.warn('[Sentry] Failed to disable after revoke:', err);
  }
}

/**
 * Sync analytics consent to Supabase (for logged-in users).
 * Silent – fails silently to avoid disrupting UX.
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
