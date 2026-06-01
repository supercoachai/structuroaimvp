import { captureServerEvent } from "./server";

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
  await captureServerEvent(distinctId, event, {
    ...properties,
    channel: "server",
    funnel: "launch",
  });
}
