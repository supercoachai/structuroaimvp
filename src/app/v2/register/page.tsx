import type { Metadata } from "next";

import RegisterV2Client from "@/components/v2/RegisterV2Client";

export const metadata: Metadata = {
  title: "Structuro v2 | Start",
  description: "Direct beginnen. Een account mag later.",
  robots: { index: false, follow: false },
};

/** Legacy URL: client redirect naar onboarding (geen naam-gate meer). */
export default function V2RegisterPage() {
  return <RegisterV2Client />;
}
