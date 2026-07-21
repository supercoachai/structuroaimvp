import type { Metadata } from "next";
import { headers } from "next/headers";

import { AcquisitionBridgeClient } from "@/components/acquisition/AcquisitionBridgeClient";
import { resolveAcquisitionLocale } from "@/lib/acquisition/acquisitionLocale";
import { LP_ORGANIC_DEFAULT_CAMPAIGN_ID, resolveLpVariant } from "@/lib/tiktok/lpConfig";
import { localizeLpVariant } from "@/lib/tiktok/lpLocalized";

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const locale = resolveAcquisitionLocale({
    acceptLanguage: headerStore.get("accept-language"),
  });
  if (locale === "en") {
    return {
      title: "Structuro | Recognize yourself? Start 3 days free",
      description:
        "No long to-do lists. One doable step per day. Try Structuro free for 3 days.",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: "Structuro | Herken je jezelf? Start 3 dagen gratis",
    description:
      "Geen lange to-do's. Eén haalbare stap per dag. Probeer Structuro 3 dagen gratis.",
    robots: { index: false, follow: false },
  };
}

type StartSearchParams = {
  campaign?: string;
  hero?: string;
  utm_content?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  lang?: string;
  locale?: string;
};

export default async function OrganicStartPage({
  searchParams,
}: {
  searchParams: Promise<StartSearchParams>;
}) {
  const params = await searchParams;
  const headerStore = await headers();
  const locale = resolveAcquisitionLocale({
    langParam: params.lang ?? params.locale ?? null,
    acceptLanguage: headerStore.get("accept-language"),
  });
  const variant = localizeLpVariant(
    resolveLpVariant({
      campaign: params.campaign ?? LP_ORGANIC_DEFAULT_CAMPAIGN_ID,
      utmContent: params.utm_content ?? null,
      utmCampaign: params.utm_campaign ?? null,
      hero: params.hero ?? null,
    }),
    locale
  );

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }

  return (
    <AcquisitionBridgeClient
      channel="organic"
      variant={variant}
      queryKey={query.toString()}
      locale={locale}
    />
  );
}
