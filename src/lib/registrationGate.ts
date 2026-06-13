import { hasEventSignupAppTrial } from "@/lib/eventSignupTrialAccess";
import { hasFreeTrial } from "@/lib/freeTrialAccess";
import { isProtectedTestAccount } from "@/lib/protectedTestAccount";
import {
  isRegistrationCheckoutEnabled,
  isRegistrationCheckoutEnabledClient,
} from "@/lib/stripe/registrationLaunch";
import { profileHasAppAccess } from "@/lib/subscriptionAccess";
import { isEventSignupSource } from "@/lib/stripe/trialConfig";

type RegistrationGateOptions = {
  /** Client components: gebruik NEXT_PUBLIC_STRUCTURO_PUBLIC_REGISTRATION. */
  clientSide?: boolean;
};

function isCheckoutGateActive(options?: RegistrationGateOptions): boolean {
  return options?.clientSide
    ? isRegistrationCheckoutEnabledClient()
    : isRegistrationCheckoutEnabled();
}

type ProfileSubscriptionRow = {
  email: string | null | undefined;
  profileRowReadOk: boolean;
  subscription_status: string | null | undefined;
  subscription_current_period_end: string | null | undefined;
  created_at?: string | null | undefined;
  signup_source?: string | null | undefined;
};

/**
 * Productie: onboarding pas na Stripe-checkout met betaalmethode,
 * tenzij de gebruiker nog binnen de gratis proeftijd zit (3 dagen na signup).
 * Na afloop van die proeftijd geldt de bestaande paywall op /abonnement.
 * Development: altijd uit (lokaal testen zonder betaling).
 */
export function requiresPaidSubscriptionBeforeOnboarding(
  row: ProfileSubscriptionRow,
  options?: RegistrationGateOptions
): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (!isCheckoutGateActive(options)) return false;
  if (isProtectedTestAccount(row.email ?? null)) return false;
  if (!row.profileRowReadOk) return true;
  // Café / event-QR: geen Stripe-checkout vóór onboarding
  if (isEventSignupSource(row.signup_source)) return false;
  if (hasEventSignupAppTrial(row.created_at, row.signup_source)) return false;
  // Gratis proeftijd: eerste 3 dagen na aanmaken account — geen betaling nodig
  if (hasFreeTrial(row.created_at)) return false;
  return !profileHasAppAccess({
    subscription_status: row.subscription_status,
    subscription_current_period_end: row.subscription_current_period_end,
  });
}

/** Doelroute vóór onboarding: checkout of intro. */
export function preOnboardingPath(
  row: ProfileSubscriptionRow,
  options?: RegistrationGateOptions
): "/registreren/plan" | "/onboarding" {
  return requiresPaidSubscriptionBeforeOnboarding(row, options)
    ? "/registreren/plan"
    : "/onboarding";
}

export type OnboardingReplayBypass = {
  replayQuery?: boolean;
  privacySetupDone?: boolean;
  lastDagstartDate?: string | null | undefined;
};

/** Bestaande gebruiker die de intro opnieuw bekijkt: geen Stripe-checkout. */
export function canAccessOnboardingWithoutCheckout(
  bypass: OnboardingReplayBypass
): boolean {
  if (bypass.replayQuery) return true;
  if (bypass.privacySetupDone) return true;
  if (bypass.lastDagstartDate) return true;
  return false;
}

/** Na account aanmaken of sessie-check op /registreren: welkom, plan of onboarding. */
export function resolvePostSignupPath(
  profile: ProfileSubscriptionRow | null | undefined,
  email: string | null | undefined,
  options?: RegistrationGateOptions
): "/welkom" | "/registreren/plan" | "/onboarding" {
  if (
    profile &&
    profileHasAppAccess({
      subscription_status: profile.subscription_status,
      subscription_current_period_end: profile.subscription_current_period_end,
    })
  ) {
    return "/welkom";
  }

  return preOnboardingPath(
    {
      email,
      profileRowReadOk: Boolean(profile),
      subscription_status: profile?.subscription_status,
      subscription_current_period_end: profile?.subscription_current_period_end,
      created_at: profile?.created_at,
      signup_source: profile?.signup_source,
    },
    options
  );
}
