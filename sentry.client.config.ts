import * as Sentry from "@sentry/nextjs";

const COOKIE_CONSENT_KEY = 'cookie_consent';

function isConsentGranted(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(COOKIE_CONSENT_KEY) === 'all';
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.5,

  tracePropagationTargets: ["localhost", /^(api\.)?greenlog\.app$/],

  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 0.1,

  // Only enabled in production AND when analytics consent is granted
  enabled: isConsentGranted(),

  sendDefaultPii: false,

  beforeSend(event) {
    // Fallback guard: if consent was revoked after init, drop all events
    if (!isConsentGranted()) {
      return null;
    }
    if (event.request?.url) {
      const url = new URL(event.request.url);
      if (url.pathname.includes("profile") || url.pathname.includes("user")) {
        event.request.url = url.pathname.replace(/\/[^/]+$/, "/[REDACTED]");
      }
    }

    if (event.user?.id) {
      event.user.id = "[REDACTED]";
    }
    if (event.user?.email) {
      event.user.email = "[REDACTED]";
    }
    if (event.user?.username) {
      event.user.username = "[REDACTED]";
    }

    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
        if (breadcrumb.data) {
          const sanitized = { ...breadcrumb.data };
          ["email", "token", "password", "Authorization", "cookie", "session"].forEach(key => {
            if (sanitized[key]) sanitized[key] = "[REDACTED]";
          });
          breadcrumb.data = sanitized;
        }
        return breadcrumb;
      });
    }

    return event;
  },

  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured with keys: undefined",
  ],
});
