import type { Metadata } from "next";

import LegalV2Client from "@/components/v2/LegalV2Client";

export const metadata: Metadata = {
  title: "Structuro v2 | Privacybeleid",
  description: "Privacybeleid van Structuro.",
  robots: { index: false, follow: false },
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
