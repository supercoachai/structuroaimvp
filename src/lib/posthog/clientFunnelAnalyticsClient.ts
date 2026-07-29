import { resolveAnalyticsVisitorId } from "@/lib/posthog/analyticsVisitorId";
import type { ClientFunnelEventName } from "@/lib/posthog/clientFunnelAllowlist";
import { captureActivationFunnelEvent } from "@/lib/posthog/track";

/**
 * Cookieless client capture + server backup (zelfde patroon als activation-funnel).
 * Gebruik voor P0-events die niet mogen verdwijnen bij tab-close / in-app browsers.
 */
export function trackClientFunnelEvent(
  event: ClientFunnelEventName,
  properties?: Record<string, unknown>,
  options?: { transport?: "sendBeacon" | "XHR" }
): void {
  if (typeof window === "undefined") return;
  const props = { ...(properties ?? {}) };
  captureActivationFunnelEvent(event, props, options);
  void postClientFunnelServer(event, props);
}

async function postClientFunnelServer(
  event: ClientFunnelEventName,
  properties: Record<string, unknown>
): Promise<void> {
  try {
    await fetch("/api/analytics/client-funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({
        event,
        visitor_id: resolveAnalyticsVisitorId(),
        properties,
      }),
    });
  } catch {
    /* ignore */
  }
}
