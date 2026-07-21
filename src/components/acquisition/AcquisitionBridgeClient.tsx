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
 * Organic EU: V2 onboarding (productiepad tot cutover v2→v1-plaats).
 * TikTok blijft v1-onboarding.
 */
function bridgeSignupHrefForChannel(channel: BridgeChannel): string {
  return channel === "organic" ? "/v2/onboarding" : "/onboarding";
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
    window.location.assign(signupHref);
  }

  return (
    <TikTokHeroLayout
      key={queryKey}
      channel={channel}
      heroId={variant.hero.id}
      campaign={variant.campaign}
      locale={locale}
      signupHref={signupHref}
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
