"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import {
  bridgePathForChannel,
  buildBridgeRegistrerenHref,
  type BridgeChannel,
} from "@/lib/acquisition/bridgePaths";
import { getBridgePresentation } from "@/lib/acquisition/bridgeCopy";
import { useI18n } from "@/lib/i18n";
import { applySignupAttributionFromSearchParams } from "@/lib/posthog/signupAttribution";
import { captureMarketingEvent } from "@/lib/posthog/track";
import type { LpResolvedVariant } from "@/lib/tiktok/lpConfig";

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
  const signupHref = buildBridgeRegistrerenHref(channel, searchParams);
  const presentation = getBridgePresentation(channel);

  useEffect(() => {
    applySignupAttributionFromSearchParams(searchParams);
  }, [searchParams]);

  function handleCtaClick() {
    const base = {
      landing_path: landingPath,
      funnel: "acquisition",
      lp_campaign: variant.campaign.id,
      lp_hero: variant.hero.id,
      lp_hero_source: variant.heroSource,
      utm_content: searchParams.get("utm_content"),
    };

    if (channel === "tiktok") {
      captureMarketingEvent("tiktok_landing_cta_clicked", {
        ...base,
        source: "tiktok",
      });
      return;
    }

    captureMarketingEvent("organic_landing_cta_clicked", {
      ...base,
      source: "structuro_eu",
    });
  }

  return (
    <TikTokHeroLayout
      key={queryKey}
      channel={channel}
      heroId={variant.hero.id}
      campaign={variant.campaign}
      signupHref={signupHref}
      onCtaClick={handleCtaClick}
      ctaLabel={presentation.ctaLabel}
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
