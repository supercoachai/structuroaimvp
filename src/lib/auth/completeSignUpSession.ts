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

/** Na OAuth, e-mail/wachtwoord of passkey: attributie, analytics, redirect-pad. */
export async function finalizeNewAccountSession(
  userId: string,
  email: string | null | undefined
): Promise<string> {
  await persistSignupAttributionToProfile(userId);
  queueSignupCompletedForAnalytics();
  await trackRegistrationFunnelServer("signup_completed", {
    source: getSignupAttributionSource(),
    utm_campaign: getStoredSignupCampaign(),
  });

  // V2 local-first: bewaar journey/taken/dump vóórdat we naar de cloud-app gaan.
  try {
    const v2 = await migrateV2LocalDataToSupabase(userId);
    if (v2.migrated) {
      return "/";
    }
  } catch {
    /* best-effort; TaskContext/V2ClaimOnAuth kan retryen */
  }

  // Account aangemaakt vanuit de anonieme acquisitie-flow: onboarding al gedaan,
  // dus niet opnieuw starten. Lokale taken migreren mee. Daarna meteen de app in.
  if (await claimAnonymousOnboardingForAccount(userId)) {
    return "/";
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
