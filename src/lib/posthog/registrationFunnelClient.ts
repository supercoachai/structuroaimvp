import type { RegisterPlanId } from "@/lib/stripe/registerPlans";
import { resolveAnalyticsVisitorId } from "@/lib/posthog/analyticsVisitorId";

type ClientFunnelEvent = "signup_completed" | "registreren_plan_viewed";

/**
 * Stuurt funnel-events naar de server (PostHog capture zonder analytics-consent).
 * Best-effort: faalt stil bij netwerkfouten.
 */
export async function trackRegistrationFunnelServer(
  event: ClientFunnelEvent,
  properties?: {
    source?: string;
    utm_campaign?: string | null;
    plan_id?: RegisterPlanId;
    default_plan_id?: RegisterPlanId;
    cancelled?: boolean;
    resume?: boolean;
  }
): Promise<void> {
  try {
    let visitorId: string | undefined;
    try {
      visitorId = resolveAnalyticsVisitorId();
    } catch {
      visitorId = undefined;
    }
    await fetch("/api/analytics/registration-funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        event,
        ...properties,
        ...(visitorId ? { visitor_id: visitorId } : {}),
      }),
    });
  } catch {
    /* ignore */
  }
}
