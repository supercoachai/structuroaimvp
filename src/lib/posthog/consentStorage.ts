/** Zelfde key als EU-landing `analytics.js` en ConsentContext. */
export const ANALYTICS_CONSENT_KEY = "structuro_analytics_consent";

export type AnalyticsConsentValue = "granted" | "denied";

export function readAnalyticsConsentFromStorage(): AnalyticsConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (v === "granted" || v === "denied") return v;
  } catch {
    /* ignore */
  }
  return null;
}
