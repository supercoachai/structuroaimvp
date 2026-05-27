/**
 * Vaste Supabase Auth storage key (cookies + storage adapter).
 * Browser (`createBrowserClient`), server (`createServerClient`) en middleware
 * moeten allemaal dezelfde key gebruiken, anders worden sessies niet herkend.
 */
export const STRUCTURO_SUPABASE_AUTH_STORAGE_KEY = "structuro-auth";

/** Client-side hint dat er nog een Supabase-sessie kan zijn (cookie/localStorage). */
export function hasSupabaseAuthHintOnClient(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(STRUCTURO_SUPABASE_AUTH_STORAGE_KEY)) return true;
  } catch {
    /* ignore */
  }
  const key = STRUCTURO_SUPABASE_AUTH_STORAGE_KEY;
  return document.cookie.split(";").some((chunk) => {
    const name = chunk.trim().split("=")[0] ?? "";
    return name === key || name.startsWith(`${key}.`);
  });
}
