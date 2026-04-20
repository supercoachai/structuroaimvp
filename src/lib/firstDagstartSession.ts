/**
 * Eénmalige “eerste dagstart na onboarding”: minimale UI zonder sidebar op /dagstart.
 * Gezet bij afronden onboarding; gewist bij “Begin nu” (start focus).
 */
export const FIRST_DAGSTART_AFTER_ONBOARDING_KEY = "structuro_first_dagstart_after_onboarding";

export function markFirstDagstartAfterOnboarding(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FIRST_DAGSTART_AFTER_ONBOARDING_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function isFirstDagstartAfterOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(FIRST_DAGSTART_AFTER_ONBOARDING_KEY) === "1";
  } catch {
    return false;
  }
}

/** Client: na wissen opnieuw sidebar-state syncen (bijv. AppLayout). */
export const FIRST_DAGSTART_AFTER_ONBOARDING_CLEARED = "structuro_first_dagstart_cleared";

export function clearFirstDagstartAfterOnboarding(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(FIRST_DAGSTART_AFTER_ONBOARDING_KEY);
    window.dispatchEvent(new Event(FIRST_DAGSTART_AFTER_ONBOARDING_CLEARED));
  } catch {
    /* ignore */
  }
}
