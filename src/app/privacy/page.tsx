import type { Metadata } from "next";

import LegalV2Client from "@/components/v2/LegalV2Client";

export const metadata: Metadata = {
  title: "Privacybeleid · Structuro",
  description: "Privacybeleid van Structuro. Canonieke versie staat op structuro.eu.",
  alternates: { canonical: "https://www.structuro.eu/privacy/" },
  robots: { index: false, follow: true },
};

export default function V2PrivacyPage() {
  return (
    <LegalV2Client
      titleKey="legal.privacyTitle"
      updatedKey="legal.privacyUpdated"
      bodyKey="legal.privacyBody"
    />
  );
}
