import posthog from "posthog-js";

import { getOrCreateAcquisitionVisitorId } from "@/lib/posthog/acquisitionAttribution";
import { ACQUISITION_VISITOR_UUID_RE } from "@/lib/posthog/parseAcquisitionPayload";

/** PostHog anon-id of fallback acquisitie-UUID voor server-side funnel-events. */
export function resolveAnalyticsVisitorId(): string {
  try {
    const phId = posthog.get_distinct_id?.();
    if (typeof phId === "string" && ACQUISITION_VISITOR_UUID_RE.test(phId)) {
      return phId;
    }
  } catch {
    /* ignore */
  }
  return getOrCreateAcquisitionVisitorId();
}
