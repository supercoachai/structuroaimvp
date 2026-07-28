import { hasActiveAppTrialOverride } from "./appTrialOverride";
import { hasLaunchGraceAccess } from "./launchGrace";
import { hasFreeTrial } from "./freeTrialAccess";
import { hasEventSignupAppTrial } from "./eventSignupTrialAccess";
import { isInternalTeamAccount } from "./internalTeamAccount";
import { isV2CardTrialCohort } from "./stripe/v2CardTrial";

/** Toegang tot de app na betaalde launch: actief, of opgezegd maar nog binnen betaalperiode. */

export function profileHasAppAccess(row: {
  subscription_status: string | null | undefined;
  subscription_current_period_end: string | null | undefined;
}): boolean {
  const s = row.subscription_status;
  if (s === "refunded" || s === "past_due" || s === "expired") return false;
  if (s === "active") return true;
  if (s === "trialing") {
    const end = row.subscription_current_period_end;
    if (!end) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[subscriptionAccess] trialing zonder subscription_current_period_end: toegang geweigerd"
        );
      }
      return false;
    }
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
 * V2 card-trial cohort (na cutoff): géén free-trial zonder Stripe; event-QR
 * (jasper/café) blijft wel via event-trial.
 */
export function profileHasAppAccessOrGrace(row: {
  email?: string | null | undefined;
  subscription_status: string | null | undefined;
  subscription_current_period_end: string | null | undefined;
  created_at: string | null | undefined;
  last_dagstart_date: string | null | undefined;
  signup_source?: string | null | undefined;
  app_trial_override_until?: string | null | undefined;
}): boolean {
  if (isInternalTeamAccount(row.email)) return true;
  if (hasActiveAppTrialOverride(row.app_trial_override_until)) return true;

  const status = row.subscription_status;
  if (status === "trial_expired") return false;

  if (profileHasAppAccess(row)) return true;
  // Event-QR (bijv. café/jasper): app-toegang zonder Stripe bij signup
  if (hasEventSignupAppTrial(row.created_at, row.signup_source)) return true;
  // Nieuwe v2-cohort: kaart-trial verplicht, geen 3-dagen free trial
  if (isV2CardTrialCohort(row.created_at)) return false;
  // Gratis proeftijd: eerste 3 dagen na aanmaken account (v1 / legacy)
  if (hasFreeTrial(row.created_at)) return true;
  // Launch-grace: bestaande testers gratis t/m 30 juni 2026
  return hasLaunchGraceAccess({
    created_at: row.created_at,
    last_dagstart_date: row.last_dagstart_date,
  });
}
