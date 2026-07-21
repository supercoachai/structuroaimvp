import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AcquisitionBridgeClient } from "@/components/acquisition/AcquisitionBridgeClient";
import {
  buildOrganicBridgePathWithQuery,
  shouldRedirectTikTokRouteToOrganic,
} from "@/lib/acquisition/bridgePaths";
import { resolveAcquisitionLocale } from "@/lib/acquisition/acquisitionLocale";
import { resolveLpVariant } from "@/lib/tiktok/lpConfig";
import { localizeLpVariant } from "@/lib/tiktok/lpLocalized";

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const locale = resolveAcquisitionLocale({
    acceptLanguage: headerStore.get("accept-language"),
  });
  if (locale === "en") {
    return {
      title: "Structuro | For ADHD brains stuck at the start",
      description:
        "No long to-do lists. One doable step per day. Try Structuro free for 3 days.",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: "Structuro | Voor ADHD-breinen die vastlopen op starten",
    description:
      "Geen lange to-do's. Eén haalbare stap per dag. Probeer Structuro 3 dagen gratis.",
    robots: { index: false, follow: false },
  };
}

type TikTokSearchParams = {
  campaign?: string;
  hero?: string;
  utm_content?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  lang?: string;
  locale?: string;
};

export default async function TikTokLandingPage({
  searchParams,
}: {
  searchParams: Promise<TikTokSearchParams>;
}) {
  const params = await searchParams;
  const headerStore = await headers();
  const locale = resolveAcquisitionLocale({
    langParam: params.lang ?? params.locale ?? null,
    acceptLanguage: headerStore.get("accept-language"),
  });
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }

  if (shouldRedirectTikTokRouteToOrganic(query)) {
    redirect(buildOrganicBridgePathWithQuery(query));
  }

  const variant = localizeLpVariant(
    resolveLpVariant({
      campaign: params.campaign ?? null,
      utmContent: params.utm_content ?? null,
      utmCampaign: params.utm_campaign ?? null,
      hero: params.hero ?? null,
      channel: "tiktok",
    }),
    locale
  );

  return (
    <AcquisitionBridgeClient
      channel="tiktok"
      variant={variant}
      queryKey={query.toString()}
      locale={locale}
    />
  );
}
