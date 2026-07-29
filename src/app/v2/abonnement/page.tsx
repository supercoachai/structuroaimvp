import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import AbonnementV2Client, {
  AbonnementV2StripeSuccess,
  AbonnementV2StripeSync,
  V2_ABONNEMENT_DEMO_STATS,
} from "@/components/v2/AbonnementV2Client";
import { isJasperSignupSource } from "@/lib/jasper/jasperOffer";
import { isProtectedTestAccount } from "@/lib/protectedTestAccount";
import {
  resolveActiveTrialDaysLeft,
  resolveRetentionPaywallReason,
  type RetentionPaywallReason,
} from "@/lib/retentionPaywallAccess";
import {
  emptyRetentionStats,
  fetchRetentionStatsForUser,
} from "@/lib/retentionStatsServer";
import { getVisibleWalletButtonsFromUserAgent } from "@/lib/stripe/walletDevice";
import { resolveStripeTrialDaysForSignupSource } from "@/lib/stripe/trialConfig";
import {
  requiresV2CardTrialCheckout,
  V2_CARD_TRIAL_DAYS,
} from "@/lib/stripe/v2CardTrial";
import { profileHasAppAccess } from "@/lib/subscriptionAccess";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Structuro v2 | Abonnement",
  description: "Behoud je ritme. Rustige betaalpagina in v2-stijl.",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ preview?: string; from?: string; reason?: string }>;
};

export default async function V2AbonnementPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const forcePreview = params.preview === "1";
  const fromStripe = params.from === "stripe";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent") ?? "";
  const visibleWallets = getVisibleWalletButtonsFromUserAgent(userAgent);

  // Zonder login: eerlijke login-staat (geen nep-trial of demostats).
  if (!user?.id) {
    return (
      <AbonnementV2Client
        reason="trial_expired"
        trialDays={V2_ABONNEMENT_DEMO_STATS.trialDays}
        visibleWallets={visibleWallets}
        jasperOffer={false}
        stats={emptyRetentionStats(null)}
        canCheckout={false}
      />
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "signup_source, created_at, subscription_status, subscription_current_period_end, last_dagstart_date, app_trial_override_until"
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
        app_trial_override_until: profile.app_trial_override_until as
          | string
          | null,
      }
    : null;

  const previewMode =
    forcePreview || isProtectedTestAccount(user.email ?? null);
  const hasAccess = row ? profileHasAppAccess(row) : false;
  const subscriptionConfirmed =
    hasAccess &&
    (row?.subscription_status === "trialing" ||
      row?.subscription_status === "active");
  const resolvedReason = row
    ? resolveRetentionPaywallReason(row)
    : "trial_expired";

  // Terug van Stripe met bevestigde subscription: eenmalige succes-overlay.
  if (!previewMode && fromStripe && subscriptionConfirmed) {
    return <AbonnementV2StripeSuccess />;
  }

  if (!previewMode && resolvedReason === null) {
    redirect("/");
  }

  const reason = resolvedReason ?? "trial_expired";
  const trialDaysLeft =
    reason === "trial_active" && row
      ? resolveActiveTrialDaysLeft(row)
      : undefined;

  const signupSource = row?.signup_source ?? null;
  const startCardTrial = row ? requiresV2CardTrialCheckout(row) : false;
  // Exact de proefduur die dit account kreeg (3 default, 7 Jasper/v2-card, 14 ADHD-café).
  const trialDays = startCardTrial
    ? V2_CARD_TRIAL_DAYS
    : resolveStripeTrialDaysForSignupSource(signupSource);
  const jasperOffer = isJasperSignupSource(signupSource);

  const stats = await fetchRetentionStatsForUser(supabase, user.id, {
    signupSource,
  }).catch(() => emptyRetentionStats(signupSource));

  // Stats en kopregel altijd dezelfde trial-lengte (nooit een losse 14).
  const alignedStats = { ...stats, trialDays };

  return (
    <>
      <AbonnementV2Client
        reason={reason}
        trialDays={trialDays}
        trialDaysLeft={trialDaysLeft}
        visibleWallets={visibleWallets}
        jasperOffer={jasperOffer}
        stats={alignedStats}
        canCheckout
        startCardTrial={startCardTrial}
      />
      <AbonnementV2StripeSync
        active={!previewMode && fromStripe && !subscriptionConfirmed}
      />
    </>
  );
}

function parseReason(raw: string | undefined): RetentionPaywallReason | null {
  if (raw === "trial_active" || raw === "trial_expired" || raw === "subscription_ended") {
    return raw;
  }
  return null;
}
