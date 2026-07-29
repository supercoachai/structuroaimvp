import LegalV2Client from "@/components/v2/LegalV2Client";

export default function V2PrivacyPage() {
  return (
    <LegalV2Client
      titleKey="legal.privacyTitle"
      updatedKey="legal.privacyUpdated"
      bodyKey="legal.privacyBody"
    />
  );
}
