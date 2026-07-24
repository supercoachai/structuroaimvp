"use client";

import { Suspense, useEffect, type MouseEvent } from "react";
import { useSearchParams } from "next/navigation";

import {
  bridgePathForChannel,
  type BridgeChannel,
} from "@/lib/acquisition/bridgePaths";
import { getBridgePresentation } from "@/lib/acquisition/bridgeCopy";
import {
  organicSoftAdvanceTarget,
  shouldSoftAdvanceOrganicLanding,
  softAdvanceHref,
} from "@/lib/acquisition/organicSoftAdvance";
import {
  enterAnonymousOnboarding,
  shouldResetAnonymousOnboardingFromClient,
} from "@/lib/auth/anonymousOnboardingEntry";
import { hasSupabaseAuthHintOnClient } from "@/lib/supabase/authStorage";
import { syncLocaleStorage } from "@/lib/i18n/clientLocale";
import { useI18n } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/types";
import { applySignupAttributionFromSearchParams } from "@/lib/posthog/signupAttribution";
import { trackAcquisitionCtaClicked } from "@/lib/posthog/acquisitionAnalyticsClient";
import { type LpResolvedVariant } from "@/lib/tiktok/lpConfig";

import { TikTokHeroLayout } from "@/components/tiktok/TikTokLandingHeroes";

type AcquisitionBridgeClientProps = {
  channel: BridgeChannel;
  variant: LpResolvedVariant;
  queryKey: string;
  locale: Locale;
};

function bridgeSignupHrefForSearchParams(searchParams: URLSearchParams): string {
  if (!shouldSoftAdvanceOrganicLanding(searchParams)) {
    return "/onboarding";
  }
  return organicSoftAdvanceTarget(searchParams);
}

function AcquisitionBridgeInner({
  channel,
  variant,
  queryKey,
  locale,
}: AcquisitionBridgeClientProps) {
  const searchParams = useSearchParams();
  const landingPath = bridgePathForChannel(channel);
  const signupHref = bridgeSignupHrefForSearchParams(searchParams);
  const presentation = getBridgePresentation(channel, locale);

  useEffect(() => {
    syncLocaleStorage(locale);
  }, [locale]);

  useEffect(() => {
    applySignupAttributionFromSearchParams(searchParams);
  }, [searchParams]);

  // Dunne bridge: EU-landing CTA's landen op /start, schrijven attributie, en gaan door.
  // Geen tweede cta_clicked: die is al op structuro.eu afgevuurd.
  useEffect(() => {
    if (channel !== "organic") return;
    if (!shouldSoftAdvanceOrganicLanding(searchParams)) return;
    if (hasSupabaseAuthHintOnClient()) return;

    applySignupAttributionFromSearchParams(searchParams);

    // V1 anonieme local-mode alleen voor v1-/onboarding. V2 heeft eigen guest-storage.
    if (!signupHref.startsWith("/v2")) {
      const reset = shouldResetAnonymousOnboardingFromClient();
      enterAnonymousOnboarding(reset ? { reset: true } : undefined);
    }

    const target = softAdvanceHref(signupHref, searchParams);
    const timer = window.setTimeout(() => {
      window.location.assign(target);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [channel, searchParams, signupHref]);

  function handleCtaClick(event: MouseEvent<HTMLAnchorElement>) {
    trackAcquisitionCtaClicked({
      channel,
      pathname: landingPath,
      searchParams,
      variant,
    });

    // Zorg dat attributie zeker bewaard is voordat we navigeren.
    applySignupAttributionFromSearchParams(searchParams);

    // Ingelogde bezoeker: laat de middleware de juiste route bepalen.
    if (hasSupabaseAuthHintOnClient()) {
      return;
    }

    event.preventDefault();

    // V1 anonieme local-mode alleen voor v1-/onboarding. V2 heeft eigen guest-storage.
    if (!signupHref.startsWith("/v2")) {
      const reset = shouldResetAnonymousOnboardingFromClient();
      enterAnonymousOnboarding(reset ? { reset: true } : undefined);
    }
    window.location.assign(softAdvanceHref(signupHref, searchParams));
  }

  return (
    <TikTokHeroLayout
      key={queryKey}
      channel={channel}
      heroId={variant.hero.id}
      campaign={variant.campaign}
      locale={locale}
      signupHref={softAdvanceHref(signupHref, searchParams)}
      onCtaClick={handleCtaClick}
      ctaLabel={variant.campaign.ctaLabel ?? presentation.ctaLabel}
      footerNote={presentation.footerNote}
      hideFooterNote={presentation.hideFooterNote}
    />
  );
}

function AcquisitionBridgeFallback() {
  const { t } = useI18n();
  return (
    <div className="st-story-bg flex min-h-[100dvh] items-center justify-center text-[var(--story-text-muted)]">
      {t("common.loading")}
    </div>
  );
}

export function AcquisitionBridgeClient(props: AcquisitionBridgeClientProps) {
  return (
    <Suspense fallback={<AcquisitionBridgeFallback />}>
      <AcquisitionBridgeInner {...props} />
    </Suspense>
  );
}
