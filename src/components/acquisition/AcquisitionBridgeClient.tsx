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
import { hasSupabaseAuthHintOnClient } from "@/lib/supabase/authStorage";
import { syncLocaleStorage } from "@/lib/i18n/clientLocale";
import type { Locale } from "@/lib/i18n/types";
import { applySignupAttributionFromSearchParams } from "@/lib/posthog/signupAttribution";
import { trackAcquisitionCtaClicked } from "@/lib/posthog/acquisitionAnalyticsClient";
import { type LpResolvedVariant } from "@/lib/tiktok/lpConfig";

import { TikTokHeroLayout } from "@/components/tiktok/TikTokLandingHeroes";
import StructuroLogoLoading from "@/components/structuro/StructuroLogoLoading";

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

function SoftAdvanceLoading() {
  return <StructuroLogoLoading className="st-story-bg" />;
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
  const softAdvance =
    channel === "organic" &&
    shouldSoftAdvanceOrganicLanding(searchParams) &&
    !hasSupabaseAuthHintOnClient();

  useEffect(() => {
    syncLocaleStorage(locale);
  }, [locale]);

  useEffect(() => {
    applySignupAttributionFromSearchParams(searchParams);
  }, [searchParams]);

  // Dunne bridge: EU-landing CTA's landen op /start, schrijven attributie, en gaan door.
  // Geen tweede cta_clicked: die is al op structuro.eu afgevuurd.
  // Geen v1 TikTok-hero flash: alleen een rustige loader tijdens soft-advance.
  useEffect(() => {
    if (!softAdvance) return;

    applySignupAttributionFromSearchParams(searchParams);

    const target = softAdvanceHref(signupHref, searchParams);
    const timer = window.setTimeout(() => {
      window.location.assign(target);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchParams, signupHref, softAdvance]);

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
    window.location.assign(softAdvanceHref(signupHref, searchParams));
  }

  if (softAdvance) {
    return <SoftAdvanceLoading />;
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
  return <StructuroLogoLoading className="st-story-bg" />;
}

export function AcquisitionBridgeClient(props: AcquisitionBridgeClientProps) {
  return (
    <Suspense fallback={<AcquisitionBridgeFallback />}>
      <AcquisitionBridgeInner {...props} />
    </Suspense>
  );
}
