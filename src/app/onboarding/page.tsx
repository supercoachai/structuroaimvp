import { Suspense } from "react";

import OnboardingV2Client from "@/components/v2/OnboardingV2Client";

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingV2Client />
    </Suspense>
  );
}
