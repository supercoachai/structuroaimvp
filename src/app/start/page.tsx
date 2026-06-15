import type { Metadata } from "next";

import { AcquisitionBridgeClient } from "@/components/acquisition/AcquisitionBridgeClient";
import { LP_ORGANIC_DEFAULT_CAMPAIGN_ID, resolveLpVariant } from "@/lib/tiktok/lpConfig";

export const metadata: Metadata = {
  title: "Structuro | Herken je jezelf? Start je proefperiode",
  description:
    "Geen lange to-do's. Eén haalbare stap per dag. Start je gratis proefperiode.",
  robots: { index: false, follow: false },
};

type StartSearchParams = {
  campaign?: string;
  hero?: string;
  utm_content?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};

export default async function OrganicStartPage({
  searchParams,
}: {
  searchParams: Promise<StartSearchParams>;
}) {
  const params = await searchParams;
  const variant = resolveLpVariant({
    campaign: params.campaign ?? LP_ORGANIC_DEFAULT_CAMPAIGN_ID,
    utmContent: params.utm_content ?? null,
    hero: params.hero ?? null,
  });

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }

  return (
    <AcquisitionBridgeClient
      channel="organic"
      variant={variant}
      queryKey={query.toString()}
    />
  );
}
