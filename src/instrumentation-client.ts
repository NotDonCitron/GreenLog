import * as Sentry from "@sentry/nextjs";

const COOKIE_CONSENT_KEY = "cookie_consent";

function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(COOKIE_CONSENT_KEY) === "all";
  } catch {
    return false;
  }
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production" && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampler: () => (hasAnalyticsConsent() ? 0.1 : 0),
  replaysSessionSampleRate: hasAnalyticsConsent() ? 0.1 : 0,
  replaysOnErrorSampleRate: hasAnalyticsConsent() ? 1.0 : 0,
  beforeSend(event) {
    return hasAnalyticsConsent() ? event : null;
  },
  beforeSendTransaction(event) {
    return hasAnalyticsConsent() ? event : null;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
