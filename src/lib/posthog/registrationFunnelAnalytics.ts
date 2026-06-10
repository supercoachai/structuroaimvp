import { captureServerEvent } from "./server";
import { shouldSkipServerAnalyticsForUser } from "./serverAnalyticsGuard";

export type RegistrationFunnelEvent =
  | "signup_completed"
  | "registreren_plan_viewed"
  | "checkout_started";

/**
 * Registratie-/checkout-funnel server-side (geen cookie-consent nodig).
 * Gebruik user id als distinctId voor correlatie met subscription_started.
 */
export async function captureRegistrationFunnelServer(
  distinctId: string,
  event: RegistrationFunnelEvent,
  properties?: Record<string, unknown>
): Promise<void> {
  if (await shouldSkipServerAnalyticsForUser(distinctId)) return;
  await captureServerEvent(distinctId, event, {
    ...properties,
    channel: "server",
    funnel: "launch",
  });
}
