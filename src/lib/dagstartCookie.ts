/**
 * Dagstart-afgerond signaal voor middleware (Edge + browser).
 * Kalenderdag in Europe/Amsterdam zodat client en server dezelfde "vandaag" gebruiken.
 */
export const STRUCTURO_DAGSTART_COOKIE = 'structuro_dagstart_datum';

/** Veilig voor middleware: corrupte cookie (ongeldige %…) mag nooit een 500 geven. */
export function decodeDagstartCookieValue(raw: string | undefined): string {
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return '';
  }
}

export function getCalendarDateAmsterdam(now: Date = new Date()): string {
  try {
    return now.toLocaleDateString('en-CA', { timeZone: 'Europe/Amsterdam' });
  } catch {
    // Zeldzame Edge/runtime-fout bij timeZone → val terug op lokale kalenderdag (YYYY-MM-DD)
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/** Client-only: zet cookie na geslaagde dagstart (niet httpOnly; middleware leest mee). */
export function setDagstartCookieOnClient(): void {
  if (typeof document === 'undefined') return;
  const v = getCalendarDateAmsterdam();
  document.cookie = `${STRUCTURO_DAGSTART_COOKIE}=${encodeURIComponent(v)}; path=/; max-age=172800; SameSite=Lax`;
}

export function clearDagstartCookieOnClient(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${STRUCTURO_DAGSTART_COOKIE}=; path=/; max-age=0`;
}
