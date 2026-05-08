"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import posthog from "posthog-js";

import { shouldSendProductAnalytics } from "@/lib/analyticsInternal";
import { ANALYTICS_CONSENT_KEY } from "@/lib/posthog/consentStorage";
import { useConsent } from "@/lib/posthog/ConsentContext";

export function PostHogPageviews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { consent } = useConsent();

  useEffect(() => {
    if (consent !== "granted" || !pathname) return;
    if (!shouldSendProductAnalytics()) return;
    try {
      if (localStorage.getItem(ANALYTICS_CONSENT_KEY) !== "granted") return;
    } catch {
      return;
    }
    let url = window.location.origin + pathname;
    const q = searchParams?.toString();
    if (q) url += `?${q}`;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, consent]);

  return null;
}
