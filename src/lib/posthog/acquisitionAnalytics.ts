import { captureServerEvent } from "./server";

export type AcquisitionAnalyticsEvent =
  | "acquisition_landing_viewed"
  | "acquisition_signup_started"
  | "tiktok_landing_viewed"
  | "tiktok_signup_started";

export type AcquisitionEventPayload = {
  visitor_id: string;
  landing_path: string;
  source: string;
  utm_source?: string | null;
  utm_campaign?: string | null;
  utm_medium?: string | null;
  utm_content?: string | null;
  referrer_domain?: string | null;
  is_tiktok?: boolean;
  has_ttclid?: boolean;
  entry_url?: string | null;
};

function baseProperties(payload: AcquisitionEventPayload): Record<string, unknown> {
  return {
    landing_path: payload.landing_path,
    source: payload.source,
    utm_source: payload.utm_source ?? null,
    utm_campaign: payload.utm_campaign ?? null,
    utm_medium: payload.utm_medium ?? null,
    utm_content: payload.utm_content ?? null,
    referrer_domain: payload.referrer_domain ?? null,
    is_tiktok: payload.is_tiktok === true,
    has_ttclid: payload.has_ttclid === true,
    entry_url: payload.entry_url ?? null,
    channel: "server",
    funnel: "acquisition",
    $process_person_profile: false,
  };
}

/**
 * Server-side acquisitie-events (betrouwbaar in TikTok in-app browser).
 * Geen cookie-consent nodig; anonieme visitor_id als distinctId.
 */
export async function captureAcquisitionEventServer(
  event: AcquisitionAnalyticsEvent,
  payload: AcquisitionEventPayload
): Promise<void> {
  const distinctId = payload.visitor_id.trim() || crypto.randomUUID();
  await captureServerEvent(distinctId, event, baseProperties(payload));
}

export async function captureAcquisitionLandingServer(
  payload: AcquisitionEventPayload
): Promise<void> {
  await captureAcquisitionEventServer("acquisition_landing_viewed", payload);
  if (payload.is_tiktok) {
    await captureAcquisitionEventServer("tiktok_landing_viewed", payload);
  }
}

export async function captureAcquisitionSignupStartedServer(
  payload: AcquisitionEventPayload
): Promise<void> {
  await captureAcquisitionEventServer("acquisition_signup_started", payload);
  if (payload.is_tiktok) {
    await captureAcquisitionEventServer("tiktok_signup_started", payload);
  }
}
