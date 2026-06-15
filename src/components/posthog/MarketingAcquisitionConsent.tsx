"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

import { isCookielessAnalyticsPath } from "@/lib/marketingPaths";
import { useConsent } from "@/lib/posthog/ConsentContext";

/**
 * Acquisitie- en activatieroutes: geen cookiebanner nodig.
 * Zet consent op "alleen noodzakelijk" voor cookieless pageviews, funnel-events en replay.
 */
export function MarketingAcquisitionConsent() {
  const pathname = usePathname();
  const { consent, deny } = useConsent();

  useLayoutEffect(() => {
    if (!isCookielessAnalyticsPath(pathname)) return;
    if (consent !== "unknown") return;
    deny();
  }, [pathname, consent, deny]);

  return null;
}
