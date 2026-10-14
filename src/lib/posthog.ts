import posthog from "posthog-js";

const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const host =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://us.i.posthog.com";

let initialised = false;

export function initPostHog() {
  if (initialised || typeof window === "undefined" || !key) return;
  posthog.init(key, {
    api_host: host,
    person_profiles: "identified_only",
    capture_pageview: false, // fired manually via router.subscribe
    capture_pageleave: false, // beforeunload doesn't fire on SPA navigation
    autocapture: false,
    capture_exceptions: true,
  });
  initialised = true;
}

export function identifyUser(userId: string, email?: string) {
  if (!initialised) return;
  posthog.identify(userId, email ? { email } : undefined);
}

export function resetUser() {
  if (!initialised) return;
  posthog.reset();
}

export function track(event: string, props?: Record<string, unknown>) {
  if (!initialised) return;
  posthog.capture(event, props);
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!initialised) return;
  posthog.captureException(error, context);
}
