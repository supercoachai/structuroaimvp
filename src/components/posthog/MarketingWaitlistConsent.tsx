"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

import { isWaitlistMarketingPath } from "@/lib/marketingPaths";
import { useConsent } from "@/lib/posthog/ConsentContext";

/**
 * Wachtlijst-marketing: geen cookiebanner, wel privacyvriendelijke cookieless analytics
 * (PostHog on_reject) zodra keuze expliciet "alleen noodzakelijk" is.
 */
export function MarketingWaitlistConsent() {
  const pathname = usePathname();
  const { consent, deny } = useConsent();

  useLayoutEffect(() => {
    if (!isWaitlistMarketingPath(pathname)) return;
    if (consent !== "unknown") return;
    deny();
  }, [pathname, consent, deny]);

  return null;
}
