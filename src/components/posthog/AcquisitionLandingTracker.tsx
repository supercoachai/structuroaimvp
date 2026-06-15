"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { isAcquisitionMarketingPath } from "@/lib/marketingPaths";
import { trackAcquisitionLanding } from "@/lib/posthog/acquisitionAnalyticsClient";
import { useConsent } from "@/lib/posthog/ConsentContext";

/**
 * Meet elke acquisitie-landing (client + server backup), incl. TikTok-attributie.
 */
export function AcquisitionLandingTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { consent } = useConsent();

  useEffect(() => {
    if (!pathname || !isAcquisitionMarketingPath(pathname)) return;
    if (consent === "unknown") return;
    trackAcquisitionLanding({ pathname, searchParams });
  }, [pathname, searchParams, consent]);

  return null;
}
