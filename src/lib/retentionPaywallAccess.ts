import { hasActiveAppTrialOverride } from "@/lib/appTrialOverride";
import {
  eventSignupTrialDaysLeft,
  eventSignupTrialExpired,
  hasEventSignupAppTrial,
} from "@/lib/eventSignupTrialAccess";
import {
  freeTrialDaysLeft,
  freeTrialExpired,
  hasFreeTrial,
} from "@/lib/freeTrialAccess";
import { hasLaunchGraceAccess } from "@/lib/launchGrace";
import { profileHasAppAccess } from "@/lib/subscriptionAccess";
import { isEventSignupSource } from "@/lib/stripe/trialConfig";

export type RetentionPaywallReason =
  | "trial_active"
  | "trial_expired"
  | "subscription_ended";

export type RetentionPaywallProfile = {
  subscription_status: string | null | undefined;
  subscription_current_period_end: string | null | undefined;
  created_at: string | null | undefined;
  signup_source: string | null | undefined;
  app_trial_override_until?: string | null | undefined;
  last_dagstart_date?: string | null | undefined;
};

function hasOptionalSubscribeAccess(row: RetentionPaywallProfile): boolean {
  if (hasActiveAppTrialOverride(row.app_trial_override_until)) return true;
  if (hasEventSignupAppTrial(row.created_at, row.signup_source)) return true;
  if (hasFreeTrial(row.created_at)) return true;
  return hasLaunchGraceAccess({
    created_at: row.created_at,
    last_dagstart_date: row.last_dagstart_date ?? null,
  });
}

/** Dagen gratis toegang die nog resteren (minimaal 1 zolang proef actief is). */
export function resolveActiveTrialDaysLeft(
  row: RetentionPaywallProfile
): number {
  if (hasActiveAppTrialOverride(row.app_trial_override_until)) {
    const end = new Date(row.app_trial_override_until!).getTime();
    const msLeft = end - Date.now();
    if (msLeft <= 0) return 0;
    return Math.ceil(msLeft / (24 * 60 * 60 * 1000));
  }
  if (hasEventSignupAppTrial(row.created_at, row.signup_source)) {
    return eventSignupTrialDaysLeft(row.created_at, row.signup_source);
  }
  if (hasFreeTrial(row.created_at)) {
    return freeTrialDaysLeft(row.created_at);
  }
  return 0;
}

/**
 * Bepaalt welk paywall-scherm /abonnement toont.
 * `null` = gebruiker heeft al betaalde toegang (redirect naar instellingen).
 */
export function resolveRetentionPaywallReason(
  row: RetentionPaywallProfile
): RetentionPaywallReason | null {
  const status = row.subscription_status;

  if (status === "trial_expired") {
    return "trial_expired";
  }

  if (
    profileHasAppAccess({
      subscription_status: row.subscription_status,
      subscription_current_period_end: row.subscription_current_period_end,
    })
  ) {
    return null;
  }

  if (
    status === "cancelled" ||
    status === "expired" ||
    status === "past_due" ||
    status === "refunded"
  ) {
    return "subscription_ended";
  }

  if (hasOptionalSubscribeAccess(row)) {
    return "trial_active";
  }

  if (
    isEventSignupSource(row.signup_source) &&
    eventSignupTrialExpired(row.created_at, row.signup_source)
  ) {
    return "trial_expired";
  }

  if (freeTrialExpired(row.created_at)) {
    return "trial_expired";
  }

  if (status === "none" || status === null || !status) {
    return "trial_expired";
  }

  return "subscription_ended";
}
