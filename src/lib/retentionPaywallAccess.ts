import { eventSignupTrialExpired } from "@/lib/eventSignupTrialAccess";
import { freeTrialExpired } from "@/lib/freeTrialAccess";
import { profileHasAppAccess } from "@/lib/subscriptionAccess";
import { isEventSignupSource } from "@/lib/stripe/trialConfig";

export type RetentionPaywallReason = "trial_expired" | "subscription_ended";

export function resolveRetentionPaywallReason(row: {
  subscription_status: string | null | undefined;
  subscription_current_period_end: string | null | undefined;
  created_at: string | null | undefined;
  signup_source: string | null | undefined;
}): RetentionPaywallReason | null {
  if (
    profileHasAppAccess({
      subscription_status: row.subscription_status,
      subscription_current_period_end: row.subscription_current_period_end,
    })
  ) {
    return null;
  }

  const status = row.subscription_status;
  if (
    status === "cancelled" ||
    status === "expired" ||
    status === "past_due" ||
    status === "refunded"
  ) {
    return "subscription_ended";
  }

  const createdAt = row.created_at;
  const signupSource = row.signup_source;
  if (
    isEventSignupSource(signupSource) &&
    eventSignupTrialExpired(createdAt, signupSource)
  ) {
    return "trial_expired";
  }

  if (freeTrialExpired(createdAt)) {
    return "trial_expired";
  }

  if (status === "none" || status === null || !status) {
    return "trial_expired";
  }

  return "subscription_ended";
}
