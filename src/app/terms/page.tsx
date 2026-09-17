import type { Metadata } from "next";

import LegalV2Client from "@/components/v2/LegalV2Client";

export const metadata: Metadata = {
  title: "Algemene voorwaarden · Structuro",
  description: "Algemene voorwaarden van Structuro. Canonieke versie staat op structuro.eu.",
  alternates: { canonical: "https://www.structuro.eu/terms/" },
  robots: { index: false, follow: true },
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
