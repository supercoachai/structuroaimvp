"use client";

import { Suspense, useEffect, type MouseEvent } from "react";
import { useSearchParams } from "next/navigation";

import {
  bridgePathForChannel,
  type BridgeChannel,
} from "@/lib/acquisition/bridgePaths";
import { getBridgePresentation } from "@/lib/acquisition/bridgeCopy";
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

/**
 * Organic EU: V2 onboarding. TikTok blijft v1-onboarding.
 */
function bridgeSignupHrefForChannel(channel: BridgeChannel): string {
  return channel === "organic" ? "/v2/onboarding" : "/onboarding";
}

/**
 * Alleen EU V2-landing (utm_campaign=eu_v2): attributie schrijven en doorsturen.
 * Kale /start en bio-links met andere campaigns blijven leesbaar.
 */
function shouldSoftAdvanceFromEuLanding(searchParams: URLSearchParams): boolean {
  const campaign = (searchParams.get("utm_campaign") || "").toLowerCase();
  return campaign === "eu_v2" || campaign.startsWith("eu_v2_");
}

/** Soft-advance behoudt lang; attributie zit al in storage/cookie vanaf /start. */
function softAdvanceHref(
  signupHref: string,
  searchParams: URLSearchParams
): string {
  const lang = searchParams.get("lang") || searchParams.get("locale");
  if (!lang || (lang !== "en" && lang !== "nl")) return signupHref;
  const next = new URL(signupHref, "https://www.structuro.ai");
  next.searchParams.set("lang", lang);
  return `${next.pathname}?${next.searchParams.toString()}`;
}

function AcquisitionBridgeInner({
  channel,
  variant,
  queryKey,
  locale,
}: AcquisitionBridgeClientProps) {
  const searchParams = useSearchParams();
  const landingPath = bridgePathForChannel(channel);
  const signupHref = bridgeSignupHrefForChannel(channel);
  const presentation = getBridgePresentation(channel, locale);

  useEffect(() => {
    syncLocaleStorage(locale);
  }, [locale]);

  useEffect(() => {
    applySignupAttributionFromSearchParams(searchParams);
  }, [searchParams]);

  // Dunne bridge: EU V2-CTA's landen op /start, schrijven attributie, en gaan door.
  // Geen tweede cta_clicked: die is al op structuro.eu afgevuurd.
  useEffect(() => {
    if (channel !== "organic") return;
    if (!shouldSoftAdvanceFromEuLanding(searchParams)) return;
    if (hasSupabaseAuthHintOnClient()) return;

    applySignupAttributionFromSearchParams(searchParams);

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

    // V2 heeft eigen localStorage-state (V2Provider); geen v1 anonymous reset.
    if (channel !== "organic") {
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
