import posthog from "posthog-js";

import {
  ANALYTICS_CONSENT_KEY,
  readAnalyticsConsentFromStorage,
} from "./consentStorage";
import { shouldSendProductAnalytics } from "@/lib/analyticsInternal";

/**
 * Core Loop / Stripe events voor PostHog. Alleen bij expliciete analytics-toestemming.
 * Geen energy_level, task_id, thought_type of ruwe duur in seconden.
 */
export function captureProductEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;
  if (!shouldSendProductAnalytics()) return;
  try {
    if (localStorage.getItem(ANALYTICS_CONSENT_KEY) !== "granted") return;
  } catch {
    return;
  }
  try {
    posthog.capture(event, properties);
  } catch {
    /* ignore */
  }
}

/** Lees toestemming buiten React (bijv. vlak voor init). */
export function hasAnalyticsConsentFromStorage(): boolean {
  return readAnalyticsConsentFromStorage() === "granted";
}
