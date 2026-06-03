import { hasLaunchGraceAccess } from "./launchGrace";
import { hasFreeTrial } from "./freeTrialAccess";

/** Toegang tot de app na betaalde launch: actief, of opgezegd maar nog binnen betaalperiode. */

export function profileHasAppAccess(row: {
  subscription_status: string | null | undefined;
  subscription_current_period_end: string | null | undefined;
}): boolean {
  const s = row.subscription_status;
  if (s === "refunded" || s === "past_due" || s === "expired") return false;
  if (s === "active") return true;
  if (s === "trialing") {
    // Handmatig verlengde proeftijd: toegang tot en met subscription_current_period_end
    const end = row.subscription_current_period_end;
    if (!end) return true; // geen einddatum ingesteld → toegang toestaan
    return new Date(end).getTime() > Date.now();
  }
  if (s === "cancelled") {
    const end = row.subscription_current_period_end;
    if (!end) return false;
    return new Date(end).getTime() > Date.now();
  }
  return false;
}

/**
 * Toegangscheck voor de paywall-gate: betalend abonnement, gratis proeftijd
 * (3 dagen na aanmaken account), of launch-grace (bestaande testers t/m 30 juni).
 *
 * Gebruik dit in de middleware-gate. De Stripe-only `profileHasAppAccess` blijft
 * bestaan voor flows die puur "heeft betaald?" willen weten (bijv. post-checkout redirect).
 */
export function profileHasAppAccessOrGrace(row: {
  subscription_status: string | null | undefined;
  subscription_current_period_end: string | null | undefined;
  created_at: string | null | undefined;
  last_dagstart_date: string | null | undefined;
}): boolean {
  if (profileHasAppAccess(row)) return true;
  // Gratis proeftijd: eerste 3 dagen na aanmaken account
  if (hasFreeTrial(row.created_at)) return true;
  // Launch-grace: bestaande testers gratis t/m 30 juni 2026
  return hasLaunchGraceAccess({
    created_at: row.created_at,
    last_dagstart_date: row.last_dagstart_date,
  });
}
