import LegalV2Client from "@/components/v2/LegalV2Client";

export default function V2TermsPage() {
  return (
    <LegalV2Client
      titleKey="legal.termsTitle"
      updatedKey="legal.termsUpdated"
      bodyKey="legal.termsBody"
    />
  );
}
