export async function enableSentryAfterConsent(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const Sentry = await import("@sentry/nextjs");
    const replay = Sentry.getReplay();
    if (replay) {
      await replay.start();
    }
  } catch {
    // Silent – consent flow must never break UX
  }
}

export async function disableSentryAfterRevoke(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const Sentry = await import("@sentry/nextjs");
    const replay = Sentry.getReplay();
    if (replay) {
      replay.stop();
    }
  } catch {
    // Silent – consent flow must never break UX
  }
}

/**
 * Sync analytics consent to Supabase (for logged-in users).
 * This function is independent of Sentry and remains functional.
 */
export async function syncAnalyticsConsentToSupabase(_userId: string, token?: string): Promise<void> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    await fetch('/api/gdpr/consent', {
      method: 'POST',
      headers,
      body: JSON.stringify({ consent_type: 'analytics', granted: true }),
    });
  } catch {
    // Silent – sync failure shouldn't break UX
  }
}
