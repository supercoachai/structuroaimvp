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

/** Auth-cookies die bij logout/account-delete gewist moeten worden. */
export function collectAuthCookieNamesToClear(
  cookieHeader: string | null | undefined
): string[] {
  const names = new Set<string>([
    STRUCTURO_SUPABASE_AUTH_STORAGE_KEY,
    `${STRUCTURO_SUPABASE_AUTH_STORAGE_KEY}.0`,
    `${STRUCTURO_SUPABASE_AUTH_STORAGE_KEY}.1`,
  ]);
  const legacy = legacySupabaseAuthCookiePrefix();
  if (legacy) {
    names.add(legacy);
    names.add(`${legacy}.0`);
    names.add(`${legacy}.1`);
  }
  if (cookieHeader) {
    for (const chunk of cookieHeader.split(";")) {
      const name = chunk.trim().split("=")[0] ?? "";
      if (name && cookieNameLooksLikeAuth(name)) names.add(name);
    }
  }
  return [...names];
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
