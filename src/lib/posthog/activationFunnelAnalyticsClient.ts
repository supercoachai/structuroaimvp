import type { ActivationFunnelEventName } from "@/lib/posthog/activationFunnelAnalytics";
import { resolveAnalyticsVisitorId } from "@/lib/posthog/analyticsVisitorId";
import {
  getStoredSignupCampaign,
  getStoredSignupSource,
} from "@/lib/posthog/signupAttribution";
import { captureActivationFunnelEvent } from "@/lib/posthog/track";

const ONBOARDING_STARTED_SESSION_KEY = "structuro_onboarding_started_tracked";
const DAGSTART_STARTED_SESSION_KEY = "structuro_dagstart_started_tracked";

function attributionContext(): Record<string, unknown> {
  const signup_source = getStoredSignupSource();
  return {
    signup_source,
    utm_campaign: getStoredSignupCampaign(),
    is_tiktok: signup_source === "tiktok",
    funnel: "activation",
  };
}

async function postActivationFunnelServer(
  event: ActivationFunnelEventName,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await fetch("/api/analytics/activation-funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({
        event,
        visitor_id: resolveAnalyticsVisitorId(),
        ...attributionContext(),
        ...payload,
      }),
    });
  } catch {
    /* ignore */
  }
}

/** Cookieless client + server backup voor P0 activatie-funnel. */
export function trackActivationFunnelStep(
  event: ActivationFunnelEventName,
  properties?: Record<string, unknown>,
  options?: { transport?: "sendBeacon" | "XHR" }
): void {
  if (typeof window === "undefined") return;
  const props = { ...attributionContext(), ...properties };
  captureActivationFunnelEvent(event, props, options);
  void postActivationFunnelServer(event, properties ?? {});
}

export function hasOnboardingStartedBeenTracked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(ONBOARDING_STARTED_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markOnboardingStartedTracked(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ONBOARDING_STARTED_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function trackOnboardingStarted(): void {
  if (typeof window === "undefined") return;
  if (hasOnboardingStartedBeenTracked()) return;
  markOnboardingStartedTracked();
  trackActivationFunnelStep("onboarding_started", {
    source: "onboarding",
  });
}

export function trackOnboardingCompleted(properties: {
  duration_bucket: string;
}): void {
  trackActivationFunnelStep("onboarding_completed", {
    ...properties,
    source: "onboarding",
  }, { transport: "sendBeacon" });
}

/**
 * Start van de dagstart-flow. Sessie-guard voorkomt het oude probleem dat het
 * event bij elke remount (reload, back-navigatie, parent re-render) opnieuw
 * vuurde en de ratio dagstart_started/dagstart_completed structureel scheef
 * stond. Het event verdween per 10 juni (fdb4925) volledig; sindsdien was de
 * start van de P0-activatiefunnel niet meer meetbaar in PostHog.
 */
export function trackDagstartStarted(source: "onboarding" | "app"): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(DAGSTART_STARTED_SESSION_KEY) === "1") return;
    sessionStorage.setItem(DAGSTART_STARTED_SESSION_KEY, "1");
  } catch {
    /* sessionStorage geblokkeerd (in-app browsers): liever 1 event te veel dan 0 */
  }
  trackActivationFunnelStep("dagstart_started", { source });
}

export function trackDagstartEnergyChosen(properties: {
  energy_level: string;
  level?: string;
  source: string;
}): void {
  trackActivationFunnelStep("dagstart_energy_chosen", properties);
}

export function trackDagstartCompleted(properties: {
  energy_level: string;
  tasks_selected_count: number;
  has_cycle_phase?: boolean;
  source: string;
  energy?: string;
  task_count?: number;
  /**
   * True wanneer `profiles.last_dagstart_date` op de server is geschreven; false
   * wanneer alleen de cookie/PostHog-event is gevuurd. Verschil > 0 = regressie van
   * de cookie-vs-DB-bug (Carlijn-gat).
   */
  db_persisted?: boolean;
}): void {
  trackActivationFunnelStep("dagstart_completed", properties, {
    transport: "sendBeacon",
  });
}
