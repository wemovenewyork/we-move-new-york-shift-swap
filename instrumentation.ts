import * as Sentry from "@sentry/nextjs";
import { assertEnv } from "./lib/env";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Fail fast, before any route can serve a request with half a config.
    // Node runtime only: the edge runtime gets a different, narrower env and
    // re-running the full check there would false-positive on server-only vars.
    assertEnv();
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
