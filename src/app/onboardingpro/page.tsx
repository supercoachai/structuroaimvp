import type { Metadata } from "next";

import OnboardingProClient from "@/components/onboardingpro/OnboardingProClient";

export const metadata: Metadata = {
  title: "Structuro | Onboarding (pro test)",
  description: "Rustige testflow: een ding tegelijk.",
  robots: { index: false, follow: false },
};

export default function OnboardingProPage() {
  return <OnboardingProClient />;
}
