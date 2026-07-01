import type { Metadata } from "next";

import OnboardingV2Client from "@/components/v2/OnboardingV2Client";

export const metadata: Metadata = {
  title: "Structuro v2 | Onboarding",
  description: "De nieuwe, rustige eerste reis. Een ding tegelijk.",
  robots: { index: false, follow: false },
};

export default function V2OnboardingPage() {
  return <OnboardingV2Client />;
}
