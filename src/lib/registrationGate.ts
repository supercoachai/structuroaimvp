import { isProtectedTestAccount } from "@/lib/protectedTestAccount";
import { isRegistrationCheckoutEnabled } from "@/lib/stripe/registrationLaunch";
import { profileHasAppAccess } from "@/lib/subscriptionAccess";
import { hasFreeTrial } from "@/lib/freeTrialAccess";

type ProfileSubscriptionRow = {
  email: string | null | undefined;
  profileRowReadOk: boolean;
  subscription_status: string | null | undefined;
  subscription_current_period_end: string | null | undefined;
  created_at?: string | null | undefined;
};

/**
 * Productie: nieuwe accounts mogen onboarding pas na geslaagde Stripe-checkout
 * OF als ze nog binnen de 3-dagen gratis proeftijd zitten.
 * Development: altijd uit (lokaal testen zonder betaling).
 */
export function requiresPaidSubscriptionBeforeOnboarding(
  row: ProfileSubscriptionRow
): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (!isRegistrationCheckoutEnabled()) return false;
  if (isProtectedTestAccount(row.email ?? null)) return false;
  if (!row.profileRowReadOk) return true;
  // Gratis proeftijd: eerste 3 dagen na aanmaken account — geen betaling nodig
  if (hasFreeTrial(row.created_at)) return false;
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
