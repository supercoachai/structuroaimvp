import type { Metadata } from "next";

import HomeV2Client from "@/components/v2/HomeV2Client";

export const metadata: Metadata = {
  title: "Structuro v2 | Home",
  description: "Je ene ding van vandaag, met rustig afronden.",
  robots: { index: false, follow: false },
};

export default function V2HomePage() {
  return <HomeV2Client />;
}
