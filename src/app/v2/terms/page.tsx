import type { Metadata } from "next";

import LegalV2Client from "@/components/v2/LegalV2Client";

export const metadata: Metadata = {
  title: "Structuro v2 | Algemene voorwaarden",
  description: "Algemene voorwaarden van Structuro.",
  robots: { index: false, follow: false },
};

export default function V2TermsPage() {
  return (
    <LegalV2Client
      titleKey="legal.termsTitle"
      updatedKey="legal.termsUpdated"
      bodyKey="legal.termsBody"
    />
  );
}
