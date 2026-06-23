"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { isCookielessAnalyticsPath } from "@/lib/marketingPaths";
import { trackOnboardingStarted } from "@/lib/posthog/activationFunnelAnalyticsClient";
import { useConsent } from "@/lib/posthog/ConsentContext";

/**
 * Meet onboarding_started op /onboarding (client + server backup, cookieless).
 */
export function OnboardingActivationTracker() {
  const pathname = usePathname();
  const { consent } = useConsent();

  useEffect(() => {
    if (!pathname?.startsWith("/onboarding")) return;
    if (!isCookielessAnalyticsPath(pathname)) return;
    if (consent === "unknown") return;
    trackOnboardingStarted();
  }, [pathname, consent]);

  return null;
}
