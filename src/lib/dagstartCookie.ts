import type { Locale } from '@/lib/i18n/types';

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

/** Morgen-kalenderdag in Europe/Amsterdam (YYYY-MM-DD), benadering via +24 uur. */
export function getTomorrowCalendarDateAmsterdam(now: Date = new Date()): string {
  return getCalendarDateAmsterdam(new Date(now.getTime() + 24 * 60 * 60 * 1000));
}

/** Uur 0–23 in Europe/Amsterdam (zelfde dagafbakening als dagstart). */
export function getClockHourAmsterdam(now: Date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('nl-NL', {
      timeZone: 'Europe/Amsterdam',
      hour: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(now);
    const hourPart = parts.find((p) => p.type === 'hour')?.value;
    const h = hourPart != null ? parseInt(hourPart, 10) : NaN;
    if (Number.isFinite(h) && h >= 0 && h <= 23) return h;
  } catch {
    /* fallthrough */
  }
  return now.getHours();
}

/**
 * Korte begroeting voor UI, afgestemd op lokale dagritme (NL).
 * Ochtend / middag / avond / nacht op basis van Amsterdam-tijd.
 */
export function getTimeOfDayGreetingNl(now: Date = new Date()): string {
  const h = getClockHourAmsterdam(now);
  if (h >= 5 && h < 12) return 'Goedemorgen';
  if (h >= 12 && h < 18) return 'Goedemiddag';
  if (h >= 18 && h < 23) return 'Goedenavond';
  return 'Goedenacht';
}

/** Korte begroeting voor UI (NL of EN), zelfde uurregels als dagstart (Amsterdam). */
export function getTimeOfDayGreeting(
  locale: Locale,
  now: Date = new Date()
): string {
  if (locale !== 'en') return getTimeOfDayGreetingNl(now);
  const h = getClockHourAmsterdam(now);
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 18) return 'Good afternoon';
  if (h >= 18 && h < 23) return 'Good evening';
  return 'Good night';
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

/**
 * Client: of de dagstart-cookie overeenkomt met vandaag (Amsterdam).
 * Gebruikt indexOf('=') i.p.v. split('=') zodat waarden met '=' niet breken.
 */
export function isDagstartDoneTodayClient(): boolean {
  if (typeof document === 'undefined') return false;
  const today = getCalendarDateAmsterdam();
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const s = part.trim();
    const eq = s.indexOf('=');
    if (eq < 0) continue;
    const key = s.slice(0, eq).trim();
    if (key !== STRUCTURO_DAGSTART_COOKIE) continue;
    const raw = s.slice(eq + 1);
    return decodeDagstartCookieValue(raw) === today;
  }
  return false;
}
