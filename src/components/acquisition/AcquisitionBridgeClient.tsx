"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import {
  bridgePathForChannel,
  buildBridgeRegistrerenHref,
  type BridgeChannel,
} from "@/lib/acquisition/bridgePaths";
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
      heroId={variant.hero.id}
      campaign={variant.campaign}
      signupHref={signupHref}
      onCtaClick={handleCtaClick}
    />
  );
}

function AcquisitionBridgeFallback() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#EEF1FB] text-slate-600">
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
