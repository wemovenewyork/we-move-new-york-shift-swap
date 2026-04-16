import * as Sentry from "@sentry/nextjs";

const SENSITIVE_KEYS = /^(password|token|authorization|cookie|secret|api_key|email)$/i;

function scrubSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = SENSITIVE_KEYS.test(key) ? "[Filtered]" : value;
  }
  return result;
}

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  enabled: process.env.NODE_ENV === "production",
  beforeSend(event) {
    if (event.request?.data && typeof event.request.data === "object") {
      event.request.data = scrubSensitiveFields(event.request.data as Record<string, unknown>);
    }
    if (event.extra && typeof event.extra === "object") {
      event.extra = scrubSensitiveFields(event.extra as Record<string, unknown>);
    }
    if (event.contexts && typeof event.contexts === "object") {
      event.contexts = scrubSensitiveFields(event.contexts as Record<string, unknown>) as typeof event.contexts;
    }
    return event;
  },
});
