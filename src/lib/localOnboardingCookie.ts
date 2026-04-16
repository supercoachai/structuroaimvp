/**
 * Middleware kan localStorage niet lezen. Deze cookie spiegelt
 * `structuro_onboarding_completed_local` voor lokale test (geen Supabase-user).
 */
export const LOCAL_ONBOARDING_DONE_COOKIE = "structuro_local_onboarding_done";

export function isLocalOnboardingDoneCookieValue(
  raw: string | undefined
): boolean {
  return raw === "1";
}

export function setLocalOnboardingDoneCookieOnClient(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCAL_ONBOARDING_DONE_COOKIE}=1; path=/; max-age=31536000; SameSite=Lax`;
}

export function clearLocalOnboardingDoneCookieOnClient(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCAL_ONBOARDING_DONE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function hasStructuroLocalModeCookieOnClient(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith("structuro_local_mode="));
}

/**
 * Eénmalige vlag vanaf login-knop → /onboarding (cookie is soms nog niet leesbaar in eerste tick).
 */
const ENTERING_LOCAL_ONBOARDING_KEY = "structuro_entering_local_onboarding";

export function markEnteringLocalOnboardingSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ENTERING_LOCAL_ONBOARDING_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** True als lokale test actief: cookie óf net gezet via login (sessionStorage). */
export function detectLocalOnboardingSession(): boolean {
  if (typeof window === "undefined") return false;
  if (hasStructuroLocalModeCookieOnClient()) return true;
  try {
    if (window.sessionStorage.getItem(ENTERING_LOCAL_ONBOARDING_KEY) === "1") {
      window.sessionStorage.removeItem(ENTERING_LOCAL_ONBOARDING_KEY);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
