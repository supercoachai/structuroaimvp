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
import { useI18n } from "@/lib/i18n";
import { applySignupAttributionFromSearchParams } from "@/lib/posthog/signupAttribution";
import { captureMarketingEvent } from "@/lib/posthog/track";
import {
  isUnsubstitutedUtmContent,
  type LpResolvedVariant,
} from "@/lib/tiktok/lpConfig";

import { TikTokHeroLayout } from "@/components/tiktok/TikTokLandingHeroes";

type AcquisitionBridgeClientProps = {
  channel: BridgeChannel;
  variant: LpResolvedVariant;
  queryKey: string;
};

function AcquisitionBridgeInner({
  channel,
  variant,
  queryKey,
}: AcquisitionBridgeClientProps) {
  const searchParams = useSearchParams();
  const landingPath = bridgePathForChannel(channel);
  // CTA start de onboarding meteen (anoniem). Gegevens vragen we pas na de eerste dagstart.
  const signupHref = "/onboarding";
  const presentation = getBridgePresentation(channel);

  useEffect(() => {
    applySignupAttributionFromSearchParams(searchParams);
  }, [searchParams]);

  function handleCtaClick(event: MouseEvent<HTMLAnchorElement>) {
    const rawUtmContent = searchParams.get("utm_content");
    const base = {
      landing_path: landingPath,
      funnel: "acquisition",
      lp_campaign: variant.campaign.id,
      lp_hero: variant.hero.id,
      lp_hero_source: variant.heroSource,
      utm_content: isUnsubstitutedUtmContent(rawUtmContent) ? null : rawUtmContent,
    };

    if (channel === "tiktok") {
      captureMarketingEvent("tiktok_landing_cta_clicked", {
        ...base,
        source: "tiktok",
      });
    } else {
      captureMarketingEvent("organic_landing_cta_clicked", {
        ...base,
        source: "structuro_eu",
      });
    }

    // Zorg dat attributie zeker bewaard is voordat we navigeren.
    applySignupAttributionFromSearchParams(searchParams);

    // Ingelogde bezoeker: laat de middleware de juiste route bepalen.
    if (hasSupabaseAuthHintOnClient()) {
      return;
    }

    event.preventDefault();

    // Een marketing-CTA start de anonieme onboarding. Bestaande voortgang of
    // lokale taken blijven staan: alleen een verse sessie (geen voortgang, geen
    // lokale taken) mag resetten. De middleware-guard bepaalt vervolgens de
    // juiste vervolgstap op basis van /onboarding.
    const reset = shouldResetAnonymousOnboardingFromClient();
    enterAnonymousOnboarding(reset ? { reset: true } : undefined);
    window.location.assign("/onboarding");
  }

  return (
    <TikTokHeroLayout
      key={queryKey}
      channel={channel}
      heroId={variant.hero.id}
      campaign={variant.campaign}
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
