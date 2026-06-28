import type { Metadata } from "next";
import { redirect } from "next/navigation";

import JasperLandingClient from "@/components/jasper/JasperLandingClient";
import { buildOrganicBridgePathWithQuery } from "@/lib/acquisition/bridgePaths";
import { ORGANIC_SIGNUP_SOURCE } from "@/lib/acquisition/bridgePaths";

export const metadata: Metadata = {
  title: "Structuro voor podcastluisteraars | Welkom Jasper-luisteraar",
  description:
    "Speciale aanbieding voor luisteraars van Jasper. 7 dagen gratis, dan 3 maanden voor 7,99 euro.",
  robots: { index: false, follow: false },
};

type JasperSearchParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  source?: string;
};

/**
 * Podcast-aanbieding voor luisteraars van Jasper.
 * Attributie: utm_source=jasper_podcast (default als de URL leeg is).
 * EU-organic verkeer (structuro.eu) hoort niet hier: redirect naar /start zodat
 * de aanbieding niet onbedoeld bij niet-podcast-bezoekers terechtkomt.
 */
export default async function JasperLandingPage({
  searchParams,
}: {
  searchParams: Promise<JasperSearchParams>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }

  const incomingSource = (
    params.utm_source ??
    params.source ??
    ""
  )
    .trim()
    .toLowerCase();
  if (
    incomingSource === ORGANIC_SIGNUP_SOURCE ||
    incomingSource === "structuro.eu"
  ) {
    redirect(buildOrganicBridgePathWithQuery(query));
  }

  return <JasperLandingClient queryKey={query.toString()} />;
}
