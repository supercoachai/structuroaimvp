import type { Metadata } from "next";

import { TikTokLandingClient } from "@/components/tiktok/TikTokLandingClient";
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
  const variant = resolveLpVariant({
    campaign: params.campaign ?? null,
    utmContent: params.utm_content ?? null,
    hero: params.hero ?? null,
  });

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }

  return (
    <TikTokLandingClient
      variant={variant}
      queryKey={query.toString()}
    />
  );
}
