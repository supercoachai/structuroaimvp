"use client";

import { useEffect, useRef } from "react";
import { captureProductEvent } from "@/lib/posthog/track";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";

type AbonnementPaywallAnalyticsProps = {
  reason: "trial_expired" | "subscription_ended";
};

export function AbonnementPaywallAnalytics({
  reason,
}: AbonnementPaywallAnalyticsProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (reason === "trial_expired") {
      captureProductEvent(ANALYTICS_EVENTS.trial_expired_view, {
        source: "abonnement",
      });
    }
  }, [reason]);

  return null;
}
