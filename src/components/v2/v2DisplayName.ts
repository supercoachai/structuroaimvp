import { PREFERRED_NAME_COOKIE } from "@/lib/auth/preferredNameCookie";

/** Minimale lengte voor een aanspreeknaam (zelfde drempel als v1-onboarding). */
export const V2_NAME_MIN_LEN = 2;

/**
 * Schrijft de voornaam naar v2-journey-bronnen die account-aanmaak meeneemt:
 * localStorage + korte cookie voor OAuth-callback.
 */
export function persistV2PreferredName(name: string): string {
  const trimmed = name.trim().slice(0, 80);
  if (typeof window === "undefined") return trimmed;
  try {
    if (trimmed.length > 0) {
      window.localStorage.setItem("structuro_user_name", trimmed);
      document.cookie = `${PREFERRED_NAME_COOKIE}=${encodeURIComponent(trimmed)}; path=/; max-age=1800; samesite=lax`;
    }
  } catch {
    // Privémodus kan storage blokkeren.
  }
  return trimmed;
}
