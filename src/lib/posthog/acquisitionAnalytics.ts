import { captureServerEvent } from "./server";
import type { ServerEventRequestContext } from "./serverEventContext";

export type AcquisitionAnalyticsEvent =
  | "acquisition_landing_viewed"
  | "acquisition_signup_started"
  | "tiktok_landing_viewed"
  | "tiktok_landing_cta_clicked"
  | "organic_landing_cta_clicked"
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
  lp_campaign?: string | null;
  lp_hero?: string | null;
  lp_hero_source?: string | null;
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
    lp_campaign: payload.lp_campaign ?? null,
    lp_hero: payload.lp_hero ?? null,
    lp_hero_source: payload.lp_hero_source ?? null,
    // Vul de "Url / Screen"-kolom in PostHog ook voor server-side events, anders
    // blijft die leeg bij in-app verkeer dat alleen de server-backup haalt.
    $current_url: payload.entry_url ?? null,
    $pathname: payload.landing_path,
    channel: "server",
    funnel: "acquisition",
    // Person-processing aan: distinctId is nu het PostHog anon-id, dus dit event
    // hoort bij dezelfde persoon (anders blijft het een personless event).
    $process_person_profile: true,
  };
}

/**
 * Server-side acquisitie-events (betrouwbaar in TikTok in-app browser).
 * Geen cookie-consent nodig; anonieme visitor_id als distinctId.
 */
export async function captureAcquisitionEventServer(
  event: AcquisitionAnalyticsEvent,
  payload: AcquisitionEventPayload,
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

export async function captureAcquisitionLandingServer(
  payload: AcquisitionEventPayload,
  requestContext?: ServerEventRequestContext | null
): Promise<void> {
  await captureAcquisitionEventServer(
    "acquisition_landing_viewed",
    payload,
    requestContext
  );
  if (payload.is_tiktok) {
    await captureAcquisitionEventServer(
      "tiktok_landing_viewed",
      payload,
      requestContext
    );
  }
}

export async function captureAcquisitionSignupStartedServer(
  payload: AcquisitionEventPayload,
  requestContext?: ServerEventRequestContext | null
): Promise<void> {
  await captureAcquisitionEventServer(
    "acquisition_signup_started",
    payload,
    requestContext
  );
  if (payload.is_tiktok) {
    await captureAcquisitionEventServer(
      "tiktok_signup_started",
      payload,
      requestContext
    );
  }
}

export async function captureAcquisitionCtaClickedServer(
  payload: AcquisitionEventPayload,
  channel: "tiktok" | "organic",
  requestContext?: ServerEventRequestContext | null
): Promise<void> {
  const event =
    channel === "tiktok"
      ? "tiktok_landing_cta_clicked"
      : "organic_landing_cta_clicked";
  await captureAcquisitionEventServer(event, payload, requestContext);
}
