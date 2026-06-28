import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { profileHasAppAccess } from "@/lib/subscriptionAccess";
import { isProtectedTestAccount } from "@/lib/protectedTestAccount";
import { resolveRetentionPaywallReason } from "@/lib/retentionPaywallAccess";
import { resolveStripeTrialDaysForSignupSource } from "@/lib/stripe/trialConfig";
import { isJasperSignupSource } from "@/lib/jasper/jasperOffer";
import { getVisibleWalletButtonsFromUserAgent } from "@/lib/stripe/walletDevice";
import { PaywallShell } from "@/components/subscription/PaywallShell";
import { RetentionPaywallStats } from "@/components/subscription/RetentionPaywallStats";
import { RetentionPaywallStatsFallback } from "@/components/subscription/RetentionPaywallStatsFallback";
import { AbonnementStripeSync } from "./AbonnementStripeSync";
import { AbonnementPaywallAnalytics } from "./AbonnementPaywallAnalytics";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ preview?: string; from?: string }>;
};

export default async function AbonnementPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const forcePreview = params.preview === "1";
  const fromStripe = params.from === "stripe";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect("/login?next=/abonnement");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "signup_source, created_at, subscription_status, subscription_current_period_end, last_dagstart_date"
    )
    .eq("id", user.id)
    .maybeSingle();

  const row = profile
    ? {
        signup_source: profile.signup_source as string | null,
        created_at: profile.created_at as string | null,
        subscription_status: profile.subscription_status as string | null,
        subscription_current_period_end:
          profile.subscription_current_period_end as string | null,
        last_dagstart_date: profile.last_dagstart_date as string | null,
      }
    : null;

  const previewMode =
    forcePreview || isProtectedTestAccount(user.email ?? null);
  const hasAccess = row ? profileHasAppAccess(row) : false;
  const reason = row
    ? (resolveRetentionPaywallReason(row) ?? "trial_expired")
    : "trial_expired";

  const signupSource = row?.signup_source ?? null;
  const trialDays = resolveStripeTrialDaysForSignupSource(signupSource);
  const jasperOffer = isJasperSignupSource(signupSource);

  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent") ?? "";
  const visibleWallets = getVisibleWalletButtonsFromUserAgent(userAgent);

  return (
    <>
      <AbonnementPaywallAnalytics reason={reason} />
      <PaywallShell
        reason={reason}
        trialDays={trialDays}
        visibleWallets={visibleWallets}
        jasperOffer={jasperOffer}
        statsSlot={
          <Suspense
            fallback={<RetentionPaywallStatsFallback trialDays={trialDays} />}
          >
            <RetentionPaywallStats
              userId={user.id}
              signupSource={signupSource}
            />
          </Suspense>
        }
      />
      <AbonnementStripeSync
        redirectAfterStripe={!previewMode && hasAccess && fromStripe}
      />
    </>
  );
}
