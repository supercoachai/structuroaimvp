import { createClient } from "@/lib/supabase/client";
import { claimAnonymousOnboardingForAccount } from "@/lib/auth/claimAnonymousOnboarding";
import { migrateV2LocalDataToSupabase } from "@/lib/migrateV2LocalDataToSupabase";
import {
  getSignupAttributionSource,
  getStoredSignupCampaign,
  persistSignupAttributionToProfile,
  queueSignupCompletedForAnalytics,
} from "@/lib/posthog/signupAttribution";
import { trackRegistrationFunnelServer } from "@/lib/posthog/registrationFunnelClient";
import { resolveClientPostSignupPath } from "@/lib/postSignupRouting";
import { isGiftCompSignupSource } from "@/lib/giftCompAccess";
import { isInternalTeamAccount } from "@/lib/internalTeamAccount";
import { isEventSignupSource } from "@/lib/stripe/trialConfig";
import {
  isV2PublicEnabledClient,
  resolveLiveHomePathClient,
  resolveLivePaywallPathClient,
} from "@/lib/v2/v2LabAccess";

type FinalizeNewAccountOptions = {
  /** Na v2 account-save / claim: blijf in /v2/* (geen v1-root) als v2 publiek is. */
  homePath?: string;
};

function skipsPaidCheckout(signupSource: string | null | undefined): boolean {
  return (
    isEventSignupSource(signupSource) || isGiftCompSignupSource(signupSource)
  );
}

function v2PostAccountPath(
  homePath: string,
  signupSource: string | null | undefined,
  email: string | null | undefined
): string {
  if (isInternalTeamAccount(email)) return "/";
  if (!isV2PublicEnabledClient()) {
    if (skipsPaidCheckout(signupSource)) return "/";
    return resolveLivePaywallPathClient();
  }
  const v2Home = homePath.startsWith("/v2") ? homePath : "/";
  // Jasper / café / gift: geen kaart-poort.
  if (skipsPaidCheckout(signupSource)) {
    return v2Home === "/abonnement" ? "/" : v2Home;
  }
  return "/abonnement";
}

/** Na OAuth, e-mail/wachtwoord of passkey: attributie, analytics, redirect-pad. */
export async function finalizeNewAccountSession(
  userId: string,
  email: string | null | undefined,
  options?: FinalizeNewAccountOptions
): Promise<string> {
  const homePath = options?.homePath ?? resolveLiveHomePathClient();

  await persistSignupAttributionToProfile(userId);
  queueSignupCompletedForAnalytics();
  // Analytics mag de post-signup UI niet blokkeren (lange load na e-mail-signup).
  void trackRegistrationFunnelServer("signup_completed", {
    source: getSignupAttributionSource(),
    utm_campaign: getStoredSignupCampaign(),
  });

  // Directe welkom-mail (idempotent met auth-callback + cron).
  void fetch("/api/lifecycle/send-hello", {
    method: "POST",
    credentials: "same-origin",
  }).catch(() => {
    /* best-effort */
  });

  const attributedSource = getSignupAttributionSource();

  // V2 local-first: bewaar journey/taken/dump vóórdat we naar de cloud-app gaan.
  try {
    const v2 = await migrateV2LocalDataToSupabase(userId);
    if (v2.migrated) {
      return v2PostAccountPath(homePath, attributedSource, email);
    }
  } catch {
    /* best-effort; TaskContext/V2ClaimOnAuth kan retryen */
  }

  // Account aangemaakt vanuit de anonieme acquisitie-flow: onboarding al gedaan,
  // dus niet opnieuw starten. Lokale taken migreren mee.
  if (await claimAnonymousOnboardingForAccount(userId)) {
    if (homePath.startsWith("/v2")) {
      return v2PostAccountPath(homePath, attributedSource, email);
    }
    return homePath;
  }

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("signup_source, subscription_status, subscription_current_period_end, created_at")
    .eq("id", userId)
    .maybeSingle();

  return resolveClientPostSignupPath(
    profile
      ? {
          email,
          profileRowReadOk: true,
          subscription_status: profile.subscription_status as string | null,
          subscription_current_period_end:
            profile.subscription_current_period_end as string | null,
          created_at: profile.created_at as string | null,
          signup_source: profile.signup_source as string | null,
        }
      : null,
    email,
    { clientSide: true }
  );
}
