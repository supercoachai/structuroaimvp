"use client";

import { useEffect, useState, type ReactElement } from "react";
import { shouldSendProductAnalytics } from "@/lib/analyticsInternal";

/**
 * Laadt Vercel Analytics + Speed Insights pas na mount (kleinere eerste JS-parse).
 * Geen next/dynamic: voorkomt webpack moduleId-mismatches bij HMR in dev.
 */
export function DeferredVercelObservability() {
  const [widgets, setWidgets] = useState<ReactElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      import("@vercel/analytics/next"),
      import("@vercel/speed-insights/next"),
    ]).then(([analyticsMod, speedMod]) => {
      if (cancelled) return;
      const beforeSend = <T extends { url?: string }>(event: T | null) =>
        shouldSendProductAnalytics() ? event : null;
      const { Analytics } = analyticsMod;
      const { SpeedInsights } = speedMod;
      setWidgets(
        <>
          <Analytics beforeSend={beforeSend} />
          <SpeedInsights beforeSend={beforeSend} />
        </>
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return widgets;
}
