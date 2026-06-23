/** Zelfde key als EU-landing `analytics.js` en ConsentContext. */
export const ANALYTICS_CONSENT_KEY = "structuro_analytics_consent";

export type AnalyticsConsentValue = "granted" | "denied";

/**
 * In-memory spiegel van de consent-beslissing. Cruciaal voor in-app browsers
 * (TikTok, Instagram, iOS WebView) waar localStorage geblokkeerd is: daar faalt
 * setItem stil, waardoor client-events anders gedropt worden terwijl de
 * server-backup wél vuurt. Met deze spiegel werkt de beslissing ook zonder storage.
 */
let inMemoryConsent: AnalyticsConsentValue | null = null;

/** Onthoud de beslissing in-memory (ook als localStorage faalt). */
export function setAnalyticsConsentInMemory(
  value: AnalyticsConsentValue | null
): void {
  inMemoryConsent = value;
}

export function readAnalyticsConsentFromStorage(): AnalyticsConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (v === "granted" || v === "denied") {
      inMemoryConsent = v;
      return v;
    }
  } catch {
    /* ignore */
  }
  return inMemoryConsent;
}
