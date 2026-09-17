import { Suspense } from "react";
import type { Metadata } from "next";

import OnboardingV2Client from "@/components/v2/OnboardingV2Client";

export const metadata: Metadata = {
  title: "Dagstart starten · Structuro",
  description:
    "Anonieme dagstart. Energie eerst, daarna één haalbare stap. Geen planner, geen streaks.",
  alternates: { canonical: "https://www.structuro.ai/onboarding" },
  robots: { index: true, follow: true },
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingV2Client />
    </Suspense>
  );
}
