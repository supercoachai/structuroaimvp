import posthog from "posthog-js";

import { readAnalyticsConsentFromStorage } from "./consentStorage";
import { persistAnonymousDistinctIdForStitch } from "./identityStitch";
import { shouldSendProductAnalytics } from "@/lib/analyticsInternal";

/**
 * Leest de consent-beslissing met in-memory fallback. Belangrijk voor in-app
 * browsers (TikTok/Instagram/iOS WebView) waar localStorage geblokkeerd is: zonder
 * fallback worden client-events daar gedropt terwijl de server-backup wél vuurt.
 */
function readStoredConsent(): "granted" | "denied" | null {
  return readAnalyticsConsentFromStorage();
}

type DebugReason =
  | "sent"
  | "no-window"
  | "internal-traffic"
  | "no-consent"
  | "no-consent-decision"
  | "already-sent-today"
  | "no-user"
  | "capture-error";

/**
 * Logging-vlag voor PostHog-events. Aan in development, en aan in elke andere
 * omgeving wanneer NEXT_PUBLIC_POSTHOG_DEBUG=true. Zo kunnen we tijdens de
 * lancering tijdelijk meekijken in productie zonder code te wijzigen.
 */
function isPosthogDebugEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_POSTHOG_DEBUG === "true") return true;
  return process.env.NODE_ENV === "development";
}

/** Log zodat we zien welke events doorkomen en waarom niet. */
export function logPosthogEvent(
  channel: "product" | "anonymous" | "marketing",
  event: string,
  reason: DebugReason,
  properties?: Record<string, unknown>
) {
  if (!isPosthogDebugEnabled()) return;
  const sent = reason === "sent";
  const tag = sent ? "✓" : "✗";
  console.info(
    `[posthog:${channel}] ${tag} ${event} (${reason})`,
    properties ?? {}
  );
}

const debugLog = logPosthogEvent;

/**
 * Core Loop / Stripe events voor PostHog. Alleen bij expliciete analytics-toestemming.
 * Geen energy_level, task_id, thought_type of ruwe duur in seconden.
 */
export function captureProductEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  if (typeof window === "undefined") {
    debugLog("product", event, "no-window", properties);
    return;
  }
  if (!shouldSendProductAnalytics()) {
    debugLog("product", event, "internal-traffic", properties);
    return;
  }
  if (readStoredConsent() !== "granted") {
    debugLog("product", event, "no-consent", properties);
    return;
  }
  try {
    posthog.capture(event, properties, {
      transport:
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
          ? "sendBeacon"
          : "XHR",
    });
    debugLog("product", event, "sent", properties);
  } catch {
    debugLog("product", event, "capture-error", properties);
  }
}

/**
 * Anonieme funnel-/activatie-events (bv. app_opened, core-loop counters).
 * Werkt ook zonder consent: PostHog draait in cookieless-modus en stuurt
 * geen persoonsgegevens. NOOIT identify() of e-mail-properties hier gebruiken.
 */
export function captureAnonymousEvent(
  event: string,
  properties?: Record<string, unknown>,
  options?: { transport?: "sendBeacon" | "XHR" }
) {
  if (typeof window === "undefined") {
    debugLog("anonymous", event, "no-window", properties);
    return;
  }
  if (!shouldSendProductAnalytics()) {
    debugLog("anonymous", event, "internal-traffic", properties);
    return;
  }
  try {
    const transport =
      options?.transport ??
      (typeof document !== "undefined" &&
      document.visibilityState === "hidden"
        ? "sendBeacon"
        : "XHR");
    posthog.capture(event, properties, {
      transport,
      ...(transport === "sendBeacon" ? { send_instantly: true } : {}),
    });
    persistAnonymousDistinctIdForStitch();
    debugLog("anonymous", event, "sent", properties);
  } catch {
    debugLog("anonymous", event, "capture-error", properties);
  }
}

/**
 * P0 activatie-funnel (signup → onboarding → dagstart).
 * Cookieless, geen identify/e-mail: werkt op acquisitie-routes met auto-deny.
 */
export function captureActivationFunnelEvent(
  event: string,
  properties?: Record<string, unknown>,
  options?: { transport?: "sendBeacon" | "XHR" }
) {
  captureAnonymousEvent(event, properties, options);
}

/** Marketing/conversie-events: granted (cookies) of denied (cookieless on_reject). */
export function captureMarketingEvent(
  event: string,
  properties?: Record<string, unknown>,
  options?: { transport?: "sendBeacon" | "XHR" }
) {
  if (typeof window === "undefined") {
    debugLog("marketing", event, "no-window", properties);
    return;
  }
  if (!shouldSendProductAnalytics()) {
    debugLog("marketing", event, "internal-traffic", properties);
    return;
  }
  if (!readStoredConsent()) {
    debugLog("marketing", event, "no-consent-decision", properties);
    return;
  }
  try {
    const transport =
      options?.transport ??
      (typeof document !== "undefined" &&
      document.visibilityState === "hidden"
        ? "sendBeacon"
        : "XHR");
    posthog.capture(event, properties, {
      transport,
      ...(transport === "sendBeacon" ? { send_instantly: true } : {}),
    });
    persistAnonymousDistinctIdForStitch();
    debugLog("marketing", event, "sent", properties);
  } catch {
    debugLog("marketing", event, "capture-error", properties);
  }
}

/** Lees toestemming buiten React (bijv. vlak voor init). */
export function hasAnalyticsConsentFromStorage(): boolean {
  return readAnalyticsConsentFromStorage() === "granted";
}
