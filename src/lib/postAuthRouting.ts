"use client";

import { isProfileOnboardingUpToDate } from "@/lib/onboardingVersion";
import { isProtectedTestAccount } from "@/lib/protectedTestAccount";
import { requiresPaidSubscriptionBeforeOnboarding } from "@/lib/registrationGate";

function safeAppPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  return trimmed;
}

type ProfileRow = {
  onboarding_completed: boolean | null;
  onboarding_version: number | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  created_at?: string | null;
};

/**
 * Bepaalt waar een user na login/auth naartoe gaat.
 * Nieuwe betalende users (onboarding nog open) gaan altijd naar /onboarding,
 * ook na PWA-installatie en opnieuw inloggen in standalone mode.
 */
export function resolvePostLoginPathFromProfile(
  profile: ProfileRow | null | undefined,
  options: {
    email: string | null | undefined;
    next: string | null | undefined;
    afterCheckoutLogin: boolean;
  }
): string {
  const safeNext = safeAppPath(options.next);

  if (isProtectedTestAccount(options.email ?? null)) {
    return safeNext ?? (options.afterCheckoutLogin ? "/onboarding" : "/");
  }

  const onboardingDone = isProfileOnboardingUpToDate(
    profile?.onboarding_completed,
    profile?.onboarding_version
  );

  if (!onboardingDone) {
    const needsPay = requiresPaidSubscriptionBeforeOnboarding({
      email: options.email ?? null,
      profileRowReadOk: Boolean(profile),
      subscription_status: profile?.subscription_status ?? null,
      subscription_current_period_end:
        profile?.subscription_current_period_end ?? null,
      created_at: profile?.created_at ?? null,
    });
    if (needsPay) return "/registreren/plan?resume=1";
    return "/onboarding";
  }

  return safeNext ?? (options.afterCheckoutLogin ? "/onboarding" : "/");
}
