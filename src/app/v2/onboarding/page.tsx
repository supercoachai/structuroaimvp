import type { Metadata } from "next";
import { Suspense } from "react";

import OnboardingV2Client from "@/components/v2/OnboardingV2Client";

export const metadata: Metadata = {
  title: "Structuro v2 | Onboarding",
  description: "De nieuwe, rustige eerste reis. Een ding tegelijk.",
  robots: { index: false, follow: false },
};

function OnboardingFallback() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
      }}
    >
      …
    </main>
  );
}

export default function V2OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingFallback />}>
      <OnboardingV2Client />
    </Suspense>
  );
}
