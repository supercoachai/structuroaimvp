/** Na "Doorgaan als lokale test": vraag eerst om naam i.p.v. oude localStorage te tonen. */

/** Verwijder lokale-test cookie (bijv. na echte Supabase-login). */
export function clearStructuroLocalModeCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = "structuro_local_mode=; path=/; max-age=0; SameSite=Lax";
}

export const LOCAL_SESSION_FRESH_KEY = "structuro_local_session_fresh";

export function markLocalSessionFresh(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(LOCAL_SESSION_FRESH_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearLocalSessionFresh(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(LOCAL_SESSION_FRESH_KEY);
  } catch {
    /* ignore */
  }
}

export function isLocalSessionFresh(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(LOCAL_SESSION_FRESH_KEY) === "1";
  } catch {
    return false;
  }
}

const NAME_KEY = "structuro_user_name";

export function hasLocalDisplayName(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.localStorage.getItem(NAME_KEY);
    return Boolean(v?.trim());
  } catch {
    return false;
  }
}
