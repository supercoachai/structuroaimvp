import posthog from "posthog-js";

import {
  ANALYTICS_CONSENT_KEY,
  readAnalyticsConsentFromStorage,
} from "./consentStorage";
import { shouldSendProductAnalytics } from "@/lib/analyticsInternal";

function readStoredConsent(): "granted" | "denied" | null {
  try {
    const v = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (v === "granted" || v === "denied") return v;
  } catch {
    /* ignore */
  }
  return null;
}

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
  if (readStoredConsent() !== "granted") return;
  try {
    posthog.capture(event, properties);
  } catch {
    /* ignore */
  }
}

/** Marketing/conversie-events: granted (cookies) of denied (cookieless on_reject). */
export function captureMarketingEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;
  if (!shouldSendProductAnalytics()) return;
  if (!readStoredConsent()) return;
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
