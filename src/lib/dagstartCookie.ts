/**
 * Dagstart-afgerond signaal voor middleware (Edge + browser).
 * Kalenderdag in Europe/Amsterdam zodat client en server dezelfde "vandaag" gebruiken.
 */
export const STRUCTURO_DAGSTART_COOKIE = 'structuro_dagstart_datum';

export function getCalendarDateAmsterdam(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Europe/Amsterdam' });
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
