import {
  hasAcquisitionLandingBeenTracked,
  markAcquisitionLandingTracked,
  resolveAcquisitionAttribution,
  type AcquisitionAttribution,
} from "@/lib/posthog/acquisitionAttribution";
import { resolveAnalyticsVisitorId } from "@/lib/posthog/analyticsVisitorId";
import { captureMarketingEvent } from "@/lib/posthog/track";
import { bridgeChannelFromPath } from "@/lib/acquisition/bridgePaths";
import {
  isUnsubstitutedUtmContent,
  resolveLpVariant,
} from "@/lib/tiktok/lpConfig";

/**
 * Stuur het PostHog anonieme distinct_id als visitor_id zodat server-side acquisitie-
 * events bij dezelfde persoon horen als de client-events.
 */
function resolveServerVisitorId(): string {
  return resolveAnalyticsVisitorId();
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
  event:
    | "acquisition_landing"
    | "acquisition_signup_started"
    | "acquisition_cta_clicked",
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

/** CTA-klik: sendBeacon + server backup (XHR gaat verloren bij directe navigatie). */
export function trackAcquisitionCtaClicked(input: {
  channel: "tiktok" | "organic";
  pathname: string;
  searchParams: SearchParamsLike | null | undefined;
  variant: {
    campaign: { id: string };
    hero: { id: string };
    heroSource: string;
  };
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
  const props = {
    ...attributionProperties(attribution, entryUrl, input.searchParams),
    lp_campaign: input.variant.campaign.id,
    lp_hero: input.variant.hero.id,
    lp_hero_source: input.variant.heroSource,
    utm_content: isUnsubstitutedUtmContent(params.get("utm_content"))
      ? null
      : params.get("utm_content"),
  };

  const eventName =
    input.channel === "tiktok"
      ? "tiktok_landing_cta_clicked"
      : "organic_landing_cta_clicked";

  captureMarketingEvent(eventName, props, { transport: "sendBeacon" });

  void postAcquisitionAnalytics("acquisition_cta_clicked", {
    ...serverPayload(attribution, entryUrl, input.searchParams),
    channel: input.channel,
  });
}
