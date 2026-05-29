import { isProtectedTestAccount } from "@/lib/protectedTestAccount";
import { isRegistrationCheckoutEnabled } from "@/lib/stripe/registrationLaunch";
import { profileHasAppAccess } from "@/lib/subscriptionAccess";

type ProfileSubscriptionRow = {
  email: string | null | undefined;
  profileRowReadOk: boolean;
  subscription_status: string | null | undefined;
  subscription_current_period_end: string | null | undefined;
};

/**
 * Productie: nieuwe accounts mogen onboarding pas na geslaagde Stripe-checkout.
 * Development: uit (lokaal testen zonder betaling). Preview/productie: aan.
 */
export function requiresPaidSubscriptionBeforeOnboarding(
  row: ProfileSubscriptionRow
): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (!isRegistrationCheckoutEnabled()) return false;
  if (isProtectedTestAccount(row.email ?? null)) return false;
  if (!row.profileRowReadOk) return true;
  return !profileHasAppAccess({
    subscription_status: row.subscription_status,
    subscription_current_period_end: row.subscription_current_period_end,
  });
}

/** Doelroute vóór onboarding: checkout of intro. */
export function preOnboardingPath(row: ProfileSubscriptionRow): "/registreren/plan" | "/onboarding" {
  return requiresPaidSubscriptionBeforeOnboarding(row)
    ? "/registreren/plan"
    : "/onboarding";
}
