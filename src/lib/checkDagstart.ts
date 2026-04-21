import { getCalendarDateAmsterdam } from "./dagstartCookie";

/**
 * Moet de gebruiker de dagstart-flow zien? Vergelijking op kalenderdag in Europe/Amsterdam
 * (zelfde als middleware en dagstart-cookie).
 */
export function isDagstartNodig(lastDagstartDate: string | null | undefined): boolean {
  if (lastDagstartDate == null || String(lastDagstartDate).trim() === "") {
    return true;
  }

  const vandaag = getCalendarDateAmsterdam();
  const raw = String(lastDagstartDate).trim();
  const laatste = raw.length >= 10 ? raw.slice(0, 10) : raw;

  if (/^\d{4}-\d{2}-\d{2}$/.test(laatste)) {
    return laatste !== vandaag;
  }

  const parsed = new Date(laatste);
  if (Number.isNaN(parsed.getTime())) {
    return true;
  }

  const laatsteNorm = parsed.toLocaleDateString("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return laatsteNorm !== vandaag;
}
