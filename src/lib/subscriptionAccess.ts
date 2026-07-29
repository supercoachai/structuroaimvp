import { hasActiveAppTrialOverride } from "./appTrialOverride";
import { hasLaunchGraceAccess } from "./launchGrace";
import { hasEventSignupAppTrial } from "./eventSignupTrialAccess";
import { isInternalTeamAccount } from "./internalTeamAccount";

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
 * Toegangscheck voor de paywall-gate: betalend abonnement (of Stripe-trial),
 * event-signup trial (QR), app-trial override, intern teamaccount of
 * launch-grace (bestaande testers t/m 30 juni).
 *
 * Geen gratis proeftijd zonder checkout meer: de trial start pas ná Stripe
 * Checkout (status trialing). freeTrialAccess blijft alleen voor messaging.
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
  // Event-QR (bijv. café): 14 dagen app-toegang zonder Stripe bij signup
  if (hasEventSignupAppTrial(row.created_at, row.signup_source)) return true;
  // Launch-grace: bestaande testers gratis t/m 30 juni 2026
  return hasLaunchGraceAccess({
    created_at: row.created_at,
    last_dagstart_date: row.last_dagstart_date,
  });
}
