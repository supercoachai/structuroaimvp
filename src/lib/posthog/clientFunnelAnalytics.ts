import { captureServerEvent } from "./server";
import type { ServerEventRequestContext } from "./serverEventContext";
import {
  isClientFunnelEvent,
  type ClientFunnelEventName,
} from "./clientFunnelAllowlist";

export type ClientFunnelServerPayload = {
  visitor_id: string;
  properties?: Record<string, unknown>;
};

/**
 * Server-side backup voor cookieless client-events (in-app browsers, tab close).
 */
export async function captureClientFunnelServer(
  event: ClientFunnelEventName,
  payload: ClientFunnelServerPayload,
  requestContext?: ServerEventRequestContext | null
): Promise<void> {
  if (!isClientFunnelEvent(event)) return;
  const distinctId = payload.visitor_id.trim() || crypto.randomUUID();
  const props = payload.properties ?? {};
  await captureServerEvent(
    distinctId,
    event,
    {
      ...props,
      channel: "server",
      funnel: typeof props.funnel === "string" ? props.funnel : "client_funnel",
      $process_person_profile: true,
    },
    requestContext
  );
}
