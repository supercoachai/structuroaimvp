/**
 * Vaste Supabase Auth storage key (cookies + storage adapter).
 * Browser (`createBrowserClient`), server (`createServerClient`) en middleware
 * moeten allemaal dezelfde key gebruiken, anders worden sessies niet herkend.
 */
export const STRUCTURO_SUPABASE_AUTH_STORAGE_KEY = "structuro-auth";

function legacySupabaseAuthCookiePrefix(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const projectRef = url.replace(/^https:\/\//, "").split(".")[0];
  return projectRef ? `sb-${projectRef}-auth-token` : null;
}

function cookieNameLooksLikeAuth(name: string): boolean {
  const key = STRUCTURO_SUPABASE_AUTH_STORAGE_KEY;
  if (name === key || name.startsWith(`${key}.`)) return true;
  const legacy = legacySupabaseAuthCookiePrefix();
  if (legacy && (name === legacy || name.startsWith(`${legacy}.`))) return true;
  return false;
}

/** Client-side hint dat er nog een Supabase-sessie kan zijn (cookie/localStorage). */
export function hasSupabaseAuthHintOnClient(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(STRUCTURO_SUPABASE_AUTH_STORAGE_KEY)) return true;
  } catch {
    /* ignore */
  }
  return document.cookie.split(";").some((chunk) => {
    const name = chunk.trim().split("=")[0] ?? "";
    return cookieNameLooksLikeAuth(name);
  });
}
