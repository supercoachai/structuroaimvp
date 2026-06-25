import { captureServerEvent } from "./server";
import type { ServerEventRequestContext } from "./serverEventContext";

export type ActivationFunnelEventName =
  | "onboarding_started"
  | "onboarding_completed"
  | "dagstart_energy_chosen"
  | "dagstart_completed";

export type ActivationFunnelServerPayload = {
  visitor_id: string;
  signup_source?: string | null;
  utm_campaign?: string | null;
  is_tiktok?: boolean;
  energy_level?: string | null;
  tasks_selected_count?: number | null;
  has_cycle_phase?: boolean;
  duration_bucket?: string | null;
  source?: string | null;
  funnel?: string | null;
};

function baseProperties(
  payload: ActivationFunnelServerPayload
): Record<string, unknown> {
  return {
    signup_source: payload.signup_source ?? null,
    utm_campaign: payload.utm_campaign ?? null,
    is_tiktok: payload.is_tiktok === true,
    energy_level: payload.energy_level ?? null,
    tasks_selected_count: payload.tasks_selected_count ?? null,
    has_cycle_phase: payload.has_cycle_phase === true,
    duration_bucket: payload.duration_bucket ?? null,
    source: payload.source ?? null,
    funnel: payload.funnel ?? "activation",
    channel: "server",
    $process_person_profile: true,
  };
}

export async function captureActivationFunnelServer(
  event: ActivationFunnelEventName,
  payload: ActivationFunnelServerPayload,
  requestContext?: ServerEventRequestContext | null
): Promise<void> {
  const distinctId = payload.visitor_id.trim() || crypto.randomUUID();
  await captureServerEvent(
    distinctId,
    event,
    baseProperties(payload),
    requestContext
  );
}
