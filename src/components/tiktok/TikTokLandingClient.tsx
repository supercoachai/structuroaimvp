"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { useI18n } from "@/lib/i18n";
import { applySignupAttributionFromSearchParams } from "@/lib/posthog/signupAttribution";
import { captureMarketingEvent } from "@/lib/posthog/track";
import type { LpResolvedVariant } from "@/lib/tiktok/lpConfig";
import { buildTikTokRegistrerenHref } from "@/lib/tiktokLanding";

import { TikTokHeroLayout } from "./TikTokLandingHeroes";

type TikTokLandingClientProps = {
  variant: LpResolvedVariant;
  queryKey: string;
};

function TikTokLandingInner({ variant, queryKey }: TikTokLandingClientProps) {
  const searchParams = useSearchParams();
  const signupHref = buildTikTokRegistrerenHref(searchParams);

  useEffect(() => {
    applySignupAttributionFromSearchParams(searchParams);
  }, [searchParams]);

  function handleCtaClick() {
    captureMarketingEvent("tiktok_landing_cta_clicked", {
      landing_path: "/tiktok",
      source: "tiktok",
      funnel: "acquisition",
      lp_campaign: variant.campaign.id,
      lp_hero: variant.hero.id,
      lp_hero_source: variant.heroSource,
      utm_content: searchParams.get("utm_content"),
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

function TikTokLandingFallback() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#EEF1FB] text-slate-600">
      {t("common.loading")}
    </div>
  );
}

export function TikTokLandingClient(props: TikTokLandingClientProps) {
  return (
    <Suspense fallback={<TikTokLandingFallback />}>
      <TikTokLandingInner {...props} />
    </Suspense>
  );
}
