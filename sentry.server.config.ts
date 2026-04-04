import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  tracesSampleRate: 0.5,

  enabled: process.env.NODE_ENV === "production",

  sendDefaultPii: false,

  beforeSend(event) {
    if (event.user?.id) {
      event.user.id = "[REDACTED]";
    }
    if (event.user?.email) {
      event.user.email = "[REDACTED]";
    }
    return event;
  },
});
