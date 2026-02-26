// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://e39c2c761e9d9f1a58d35a1ad49dd473@o4510951076462592.ingest.us.sentry.io/4510951078363136",

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",
  ignoreErrors: [
    "NEXT_NOT_FOUND",
    "NEXT_REDIRECT"
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
