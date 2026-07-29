import type { Metadata } from "next";
import { Suspense } from "react";

import OnboardingV2Client from "@/components/v2/OnboardingV2Client";
import StructuroLogoLoading from "@/components/structuro/StructuroLogoLoading";

export const metadata: Metadata = {
  title: "Structuro v2 | Onboarding",
  description: "De nieuwe, rustige eerste reis. Een ding tegelijk.",
  robots: { index: false, follow: false },
};

export default function V2OnboardingPage() {
  return (
    <Suspense fallback={<StructuroLogoLoading />}>
      <OnboardingV2Client />
    </Suspense>
  );
}
