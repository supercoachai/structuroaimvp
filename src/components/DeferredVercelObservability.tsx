"use client";

import dynamic from "next/dynamic";
import { shouldSendProductAnalytics } from "@/lib/analyticsInternal";

/**
 * Laadt Vercel Analytics + Speed Insights pas na hydrate (kleinere eerste JS-parse).
 * Meetgedrag hetzelfde; alleen timing van bundel-parse verschuift naar idle-ish window.
 */
const Analytics = dynamic(
  () =>
    import("@vercel/analytics/next").then((m) => m.Analytics),
  { ssr: false }
);

const SpeedInsights = dynamic(
  () =>
    import("@vercel/speed-insights/next").then((m) => m.SpeedInsights),
  { ssr: false }
);

export function DeferredVercelObservability() {
  return (
    <>
      <Analytics
        beforeSend={(event) =>
          shouldSendProductAnalytics() ? event : null
        }
      />
      <SpeedInsights
        beforeSend={(event) =>
          shouldSendProductAnalytics() ? event : null
        }
      />
    </>
  );
}
