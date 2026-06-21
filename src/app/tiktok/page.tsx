import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AcquisitionBridgeClient } from "@/components/acquisition/AcquisitionBridgeClient";
import {
  buildOrganicBridgePathWithQuery,
  shouldRedirectTikTokRouteToOrganic,
} from "@/lib/acquisition/bridgePaths";
import { resolveLpVariant } from "@/lib/tiktok/lpConfig";

export const metadata: Metadata = {
  title: "Structuro | Voor ADHD-breinen die vastlopen op starten",
  description:
    "Geen lange to-do's. Eén haalbare stap per dag. Start je gratis proefperiode.",
  robots: { index: false, follow: false },
};

type TikTokSearchParams = {
  campaign?: string;
  hero?: string;
  utm_content?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};

export default async function TikTokLandingPage({
  searchParams,
}: {
  searchParams: Promise<TikTokSearchParams>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }

  if (shouldRedirectTikTokRouteToOrganic(query)) {
    redirect(buildOrganicBridgePathWithQuery(query));
  }

  const variant = resolveLpVariant({
    campaign: params.campaign ?? null,
    utmContent: params.utm_content ?? null,
    utmCampaign: params.utm_campaign ?? null,
    hero: params.hero ?? null,
    channel: "tiktok",
  });

  return (
    <AcquisitionBridgeClient
      channel="tiktok"
      variant={variant}
      queryKey={query.toString()}
    />
  );
}
