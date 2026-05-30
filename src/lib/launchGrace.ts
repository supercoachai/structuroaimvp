/**
 * Launch grace-period (gratis maand voor bestaande testers).
 *
 * Regel (bevestigd door Niels, 29 mei 2026):
 *   Alleen betalende klanten in de app, BEHALVE bestaande testers die op of na
 *   19 april 2026 minstens één dagstart deden. Die krijgen nog één maand gratis,
 *   t/m 30 juni 2026.
 *
 * Belangrijk (omzet-lek dichten): de grace geldt alléén voor accounts die VÓÓR de
 * launchdatum bestonden (`created_at < LAUNCH_DATE`). Anders zou een nieuwe bezoeker
 * die op 31 mei zijn eerste dagstart doet ook gratis toegang krijgen en de betaling
 * omzeilen. De grace is dus puur berekend uit bestaande kolommen
 * (`profiles.created_at` + `profiles.last_dagstart_date`); geen schema-wijziging nodig.
 */

import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";

/** Launchdatum: accounts hierna aangemaakt krijgen geen grace (alleen betalen). */
export const LAUNCH_DATE = "2026-05-31";

/** Kwalificatie: minstens één dagstart op of na deze datum. */
export const GRACE_QUALIFY_DATE = "2026-04-19";

/** Laatste dag (inclusief) dat de gratis maand geldt. */
export const GRACE_END_DATE = "2026-06-30";

function ymd(value: string | null | undefined): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (s.length < 10) return null;
  return s.slice(0, 10);
}

/** Amsterdam-kalenderdag, consistent met de dagstart-gate (niet UTC). */
function todayYmd(): string {
  return getCalendarDateAmsterdam();
}

/**
 * True als deze gebruiker onder de launch-grace valt:
 *   - account bestond vóór de launch (created_at < LAUNCH_DATE), én
 *   - deed een dagstart op/na 19 april (last_dagstart_date >= GRACE_QUALIFY_DATE), én
 *   - vandaag valt nog binnen de grace (today <= GRACE_END_DATE).
 *
 * Datumvergelijking op YYYY-MM-DD-strings is veilig (lexicografisch == chronologisch).
 */
export function hasLaunchGraceAccess(row: {
  created_at: string | null | undefined;
  last_dagstart_date: string | null | undefined;
}): boolean {
  const createdYmd = ymd(row.created_at);
  const lastDagstartYmd = ymd(row.last_dagstart_date);

  if (!createdYmd || !lastDagstartYmd) return false;
  if (!(createdYmd < LAUNCH_DATE)) return false;
  if (!(lastDagstartYmd >= GRACE_QUALIFY_DATE)) return false;
  if (!(todayYmd() <= GRACE_END_DATE)) return false;

  return true;
}
