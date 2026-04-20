"use client";

import dynamic from "next/dynamic";

const OnboardingFlow = dynamic(
  () => import("@/components/onboarding/OnboardingFlow"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 text-slate-500">
        <div className="animate-pulse text-base">Structuro laden…</div>
      </div>
    ),
  }
);

export default function OnboardingClient() {
  return <OnboardingFlow />;
}
