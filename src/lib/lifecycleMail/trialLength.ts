import { isV2CardTrialCohort, V2_CARD_TRIAL_DAYS } from "@/lib/stripe/v2CardTrial";
import { resolveStripeTrialDaysForSignupSource } from "@/lib/stripe/trialConfig";

import type { LifecycleCandidate } from "./types";

/**
 * Effectieve proefduur voor lifecycle-copy en segmentatie.
 * Card-cohort / Stripe-trialing met period_end: 7 dagen.
 * Event-sources: via signup_source. Anders default 3.
 */
export function resolveLifecycleTrialDays(
  candidate: Pick<
    LifecycleCandidate,
    "created_at" | "signup_source" | "subscription_status" | "subscription_current_period_end"
  >
): number {
  const status = (candidate.subscription_status ?? "").toLowerCase();
  if (
    status === "trialing" &&
    candidate.subscription_current_period_end
  ) {
    return V2_CARD_TRIAL_DAYS;
  }
  if (isV2CardTrialCohort(candidate.created_at)) {
    return V2_CARD_TRIAL_DAYS;
  }
  return resolveStripeTrialDaysForSignupSource(candidate.signup_source);
}

/** True als dit een Stripe card-trial is (betaalmethode al gekoppeld). */
export function isStripeCardTrialing(
  candidate: Pick<LifecycleCandidate, "subscription_status" | "subscription_current_period_end">
): boolean {
  const status = (candidate.subscription_status ?? "").toLowerCase();
  return status === "trialing" && Boolean(candidate.subscription_current_period_end);
}
