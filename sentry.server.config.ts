import * as Sentry from "@sentry/nuxt";

Sentry.init({
  dsn: "https://a844512fd006371dfdb3b1356a6c6a07@sentry.infinix-solutions.com/12",
  tracesSampleRate: 1.0,

  enableLogs: true,

  sendDefaultPii: true,
  debug: false,
});
