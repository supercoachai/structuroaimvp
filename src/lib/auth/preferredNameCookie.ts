/**
 * Aanspreeknaam die de gebruiker opgeeft op /registreren (vóór account-aanmaak).
 * Wordt als cookie meegestuurd zodat de OAuth-callback (server) de naam op het
 * nieuwe profiel kan zetten. Voor e-mail/passkey wordt localStorage gebruikt.
 */
export const PREFERRED_NAME_COOKIE = "structuro_pref_name";

/** Decodeer + begrens de cookie-waarde tot een veilige naam. */
export function sanitizePreferredNameCookieValue(
  raw: string | undefined | null
): string {
  if (!raw) return "";
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    /* gebruik ruwe waarde */
  }
  return decoded.trim().slice(0, 80);
}
