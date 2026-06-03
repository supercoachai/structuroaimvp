/**
 * Gratis proeftijd voor nieuwe gebruikers.
 *
 * Elke nieuwe registratie krijgt FREE_TRIAL_DAYS dagen gratis toegang,
 * puur berekend op basis van profiles.created_at — geen extra DB-kolom nodig.
 *
 * Na afloop wordt de gebruiker doorgestuurd naar /abonnement (via de middleware paywall).
 */

export const FREE_TRIAL_DAYS = 3;

/** Unix-timestamp (ms) waarop de proeftijd afloopt. */
function trialEndMs(created_at: string): number {
  return new Date(created_at).getTime() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * True als de gebruiker nog binnen de proeftijd zit.
 * created_at komt uit profiles.created_at (ISO-string).
 */
export function hasFreeTrial(created_at: string | null | undefined): boolean {
  if (!created_at) return false;
  const end = trialEndMs(created_at);
  if (isNaN(end)) return false;
  return Date.now() < end;
}

/**
 * Aantal volle dagen dat de proeftijd nog loopt (afgerond naar boven, minimaal 1
 * als er nog tijd over is). Geeft 0 terug als de proeftijd verlopen is.
 */
export function freeTrialDaysLeft(created_at: string | null | undefined): number {
  if (!created_at) return 0;
  const end = trialEndMs(created_at);
  if (isNaN(end)) return 0;
  const msLeft = end - Date.now();
  if (msLeft <= 0) return 0;
  return Math.ceil(msLeft / (24 * 60 * 60 * 1000));
}

/**
 * True als de proeftijd ooit is gestart (created_at bestaat) maar inmiddels
 * verlopen is. Gebruik dit voor de "trial expired" messaging op /abonnement.
 */
export function freeTrialExpired(created_at: string | null | undefined): boolean {
  if (!created_at) return false;
  const end = trialEndMs(created_at);
  if (isNaN(end)) return false;
  return Date.now() >= end;
}
