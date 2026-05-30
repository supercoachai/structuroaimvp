import { readAnalyticsConsentFromStorage } from "./posthog/consentStorage";

export const PRIVACY_SETUP_COMPLETED_KEY = "structuro_privacy_setup_completed";
export const PRIVACY_SETUP_DONE_COOKIE = "structuro_privacy_setup_done";

export function isPrivacySetupCompleted(): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (window.localStorage.getItem(PRIVACY_SETUP_COMPLETED_KEY) === "1") {
      return true;
    }
  } catch {
    /* ignore */
  }
  return document.cookie.includes(`${PRIVACY_SETUP_DONE_COOKIE}=1`);
}

export function markPrivacySetupCompleted(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PRIVACY_SETUP_COMPLETED_KEY, "1");
  } catch {
    /* ignore */
  }
  document.cookie = `${PRIVACY_SETUP_DONE_COOKIE}=1; path=/; max-age=31536000; SameSite=Lax`;
}

/** Bestaande gebruikers die analytics al gekozen hadden hoeven het scherm niet opnieuw te zien. */
export function migrateLegacyPrivacySetupIfNeeded(): void {
  if (typeof window === "undefined") return;
  if (isPrivacySetupCompleted()) return;
  if (readAnalyticsConsentFromStorage()) {
    markPrivacySetupCompleted();
  }
}
