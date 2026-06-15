"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

import { isAcquisitionMarketingPath } from "@/lib/marketingPaths";
import { useConsent } from "@/lib/posthog/ConsentContext";

/**
 * Acquisitie-routes (registreren, TikTok-LP): geen cookiebanner nodig.
 * Zet consent op "alleen noodzakelijk" voor cookieless PostHog pageviews.
 */
export function MarketingAcquisitionConsent() {
  const pathname = usePathname();
  const { consent, deny } = useConsent();

  useLayoutEffect(() => {
    if (!isAcquisitionMarketingPath(pathname)) return;
    if (consent !== "unknown") return;
    deny();
  }, [pathname, consent, deny]);

  return null;
}
