import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.5,

  tracePropagationTargets: ["localhost", /^(api\.)?greenlog\.app$/],

  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 0.1,

  enabled: process.env.NODE_ENV === "production",

  sendDefaultPii: false,

  beforeSend(event) {
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
