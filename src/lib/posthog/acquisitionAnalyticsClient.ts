import posthog from "posthog-js";

import {
  getOrCreateAcquisitionVisitorId,
  hasAcquisitionLandingBeenTracked,
  markAcquisitionLandingTracked,
  resolveAcquisitionAttribution,
  type AcquisitionAttribution,
} from "@/lib/posthog/acquisitionAttribution";
import { captureMarketingEvent } from "@/lib/posthog/track";
import { bridgeChannelFromPath } from "@/lib/acquisition/bridgePaths";
import { resolveLpVariant } from "@/lib/tiktok/lpConfig";

/** Accepteert UUID v1-v8 (PostHog anon-id is v7). Spiegelt de server-route-validatie. */
const VISITOR_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Stuur het PostHog anonieme distinct_id als visitor_id zodat server-side acquisitie-
 * events bij dezelfde persoon horen als de client-events. Valt terug op een losse
 * acquisitie-UUID als PostHog (nog) geen geldig id heeft.
 */
function resolveServerVisitorId(): string {
  try {
    const phId = posthog.get_distinct_id?.();
    if (typeof phId === "string" && VISITOR_UUID_RE.test(phId)) return phId;
  } catch {
    /* ignore */
  }
  return getOrCreateAcquisitionVisitorId();
}

type SearchParamsLike = {
  toString(): string;
  get(name: string): string | null;
};

function attributionProperties(
  attribution: AcquisitionAttribution,
  entryUrl: string,
  searchParams: SearchParamsLike | null | undefined
): Record<string, unknown> {
  const props: Record<string, unknown> = {
    landing_path: attribution.landing_path,
    source: attribution.source,
    utm_source: attribution.utm_source,
    utm_campaign: attribution.utm_campaign,
    utm_medium: attribution.utm_medium,
    utm_content: attribution.utm_content,
    referrer_domain: attribution.referrer_domain,
    is_tiktok: attribution.is_tiktok,
    has_ttclid: attribution.has_ttclid,
    entry_url: entryUrl,
    channel: "client",
    funnel: "acquisition",
  };

  if (bridgeChannelFromPath(attribution.landing_path)) {
    const variant = resolveLpVariant({
      campaign: searchParams?.get("campaign"),
      utmContent: searchParams?.get("utm_content"),
      utmCampaign: searchParams?.get("utm_campaign"),
      hero: searchParams?.get("hero"),
    });
    props.lp_campaign = variant.campaign.id;
    props.lp_hero = variant.hero.id;
    props.lp_hero_source = variant.heroSource;
  }

  return props;
}

function serverPayload(
  attribution: AcquisitionAttribution,
  entryUrl: string,
  searchParams: SearchParamsLike | null | undefined
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    visitor_id: resolveServerVisitorId(),
    landing_path: attribution.landing_path,
    source: attribution.source,
    utm_source: attribution.utm_source,
    utm_campaign: attribution.utm_campaign,
    utm_medium: attribution.utm_medium,
    utm_content: attribution.utm_content,
    referrer_domain: attribution.referrer_domain,
    is_tiktok: attribution.is_tiktok,
    has_ttclid: attribution.has_ttclid,
    entry_url: entryUrl,
  };

  if (bridgeChannelFromPath(attribution.landing_path)) {
    const variant = resolveLpVariant({
      campaign: searchParams?.get("campaign"),
      utmContent: searchParams?.get("utm_content"),
      utmCampaign: searchParams?.get("utm_campaign"),
      hero: searchParams?.get("hero"),
    });
    payload.lp_campaign = variant.campaign.id;
    payload.lp_hero = variant.hero.id;
    payload.lp_hero_source = variant.heroSource;
  }

  return payload;
}

async function postAcquisitionAnalytics(
  event: "acquisition_landing" | "acquisition_signup_started",
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const routeSegment = event.replace(/_/g, "-");
    await fetch(`/api/analytics/${routeSegment}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify(payload),
    });
  } catch {
    /* ignore */
  }
}

/** Eén landing per pad per sessie (client + server backup). */
export function trackAcquisitionLanding(input: {
  pathname: string;
  searchParams: SearchParamsLike | null | undefined;
}): void {
  if (typeof window === "undefined") return;
  if (hasAcquisitionLandingBeenTracked(input.pathname)) return;

  const params = new URLSearchParams(input.searchParams?.toString() ?? "");
  const attribution = resolveAcquisitionAttribution({
    pathname: input.pathname,
    searchParams: params,
    referrer: document.referrer || null,
  });
  const entryUrl = `${window.location.origin}${attribution.landing_path}${
    params.toString() ? `?${params.toString()}` : ""
  }`;
  const props = attributionProperties(attribution, entryUrl, input.searchParams);

  markAcquisitionLandingTracked(input.pathname);

  captureMarketingEvent("acquisition_landing_viewed", props);
  if (attribution.is_tiktok) {
    captureMarketingEvent("tiktok_landing_viewed", props);
  }

  void postAcquisitionAnalytics("acquisition_landing", serverPayload(attribution, entryUrl, input.searchParams));
}

export function trackAcquisitionSignupStarted(input: {
  pathname: string;
  searchParams: SearchParamsLike | null | undefined;
}): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(input.searchParams?.toString() ?? "");
  const attribution = resolveAcquisitionAttribution({
    pathname: input.pathname,
    searchParams: params,
    referrer: document.referrer || null,
  });
  const entryUrl = `${window.location.origin}${attribution.landing_path}${
    params.toString() ? `?${params.toString()}` : ""
  }`;
  const props = attributionProperties(attribution, entryUrl, input.searchParams);

  captureMarketingEvent("acquisition_signup_started", props);
  if (attribution.is_tiktok) {
    captureMarketingEvent("tiktok_signup_started", props);
  }

  void postAcquisitionAnalytics(
    "acquisition_signup_started",
    serverPayload(attribution, entryUrl, input.searchParams)
  );
}
