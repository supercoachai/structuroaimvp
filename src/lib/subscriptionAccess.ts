import { hasLaunchGraceAccess } from "./launchGrace";

/** Toegang tot de app na betaalde launch: actief, of opgezegd maar nog binnen betaalperiode. */

export function profileHasAppAccess(row: {
  subscription_status: string | null | undefined;
  subscription_current_period_end: string | null | undefined;
}): boolean {
  const s = row.subscription_status;
  if (s === "refunded" || s === "past_due" || s === "expired") return false;
  if (s === "active") return true;
  if (s === "cancelled") {
    const end = row.subscription_current_period_end;
    if (!end) return false;
    return new Date(end).getTime() > Date.now();
  }
  return false;
}

/**
 * Toegangscheck voor de paywall-gate: betalend abonnement OF launch-grace
 * (bestaande tester met dagstart >= 19 april, gratis t/m 30 juni).
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
  return hasLaunchGraceAccess({
    created_at: row.created_at,
    last_dagstart_date: row.last_dagstart_date,
  });
}
