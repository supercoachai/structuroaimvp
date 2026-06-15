/**
 * Acquisitie-bridge routes: TikTok (paid/organic social) vs organische website.
 * Zelfde LP-componenten en campagne-copy; aparte URL + attributie.
 */

import { buildOrganicStartUrl, buildTikTokLandingUrl } from "@/lib/tiktok/lpConfig";

export type BridgeChannel = "tiktok" | "organic";

export const TIKTOK_BRIDGE_PATH = "/tiktok";
export const ORGANIC_BRIDGE_PATH = "/start";

export const TIKTOK_SIGNUP_SOURCE = "tiktok";
export const ORGANIC_SIGNUP_SOURCE = "structuro_eu";

export const TIKTOK_DEFAULT_CAMPAIGN = "tiktok_promote";
export const TIKTOK_DEFAULT_MEDIUM = "paid_social";
export const ORGANIC_DEFAULT_MEDIUM = "organic";
export const ORGANIC_DEFAULT_CAMPAIGN = "website";

type SearchParamsLike = {
  get(name: string): string | null;
  toString(): string;
};

function sanitizeCampaign(raw: string | null | undefined): string {
  const t = (raw ?? "").trim().slice(0, 64);
  if (!t) return "";
  return t.replace(/[^a-zA-Z0-9_-]/g, "") || "";
}

function sanitizeContent(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim().slice(0, 64);
  if (!t) return null;
  return t.replace(/[^a-zA-Z0-9_-]/g, "") || null;
}

export function bridgeChannelFromPath(pathname: string | null | undefined): BridgeChannel | null {
  if (!pathname) return null;
  if (pathname === TIKTOK_BRIDGE_PATH || pathname.startsWith(`${TIKTOK_BRIDGE_PATH}/`)) {
    return "tiktok";
  }
  if (pathname === ORGANIC_BRIDGE_PATH || pathname.startsWith(`${ORGANIC_BRIDGE_PATH}/`)) {
    return "organic";
  }
  return null;
}

export function bridgePathForChannel(channel: BridgeChannel): string {
  return channel === "tiktok" ? TIKTOK_BRIDGE_PATH : ORGANIC_BRIDGE_PATH;
}

/** Registratie-URL met channel-specifieke attributie; behoudt utm_campaign uit de bridge-URL. */
export function buildBridgeRegistrerenHref(
  channel: BridgeChannel,
  searchParams?: SearchParamsLike | null
): string {
  if (channel === "tiktok") {
    const campaign = sanitizeCampaign(searchParams?.get("utm_campaign")) || TIKTOK_DEFAULT_CAMPAIGN;
    const params = new URLSearchParams({
      source: TIKTOK_SIGNUP_SOURCE,
      utm_source: TIKTOK_SIGNUP_SOURCE,
      utm_medium: TIKTOK_DEFAULT_MEDIUM,
      utm_campaign: campaign,
    });
    const video = sanitizeContent(searchParams?.get("utm_content"));
    if (video) params.set("utm_content", video);
    return `/registreren?${params.toString()}`;
  }

  const campaign =
    sanitizeCampaign(searchParams?.get("utm_campaign")) || ORGANIC_DEFAULT_CAMPAIGN;
  const medium = sanitizeCampaign(searchParams?.get("utm_medium")) || ORGANIC_DEFAULT_MEDIUM;
  const params = new URLSearchParams({
    source: ORGANIC_SIGNUP_SOURCE,
    utm_source: ORGANIC_SIGNUP_SOURCE,
    utm_medium: medium,
    utm_campaign: campaign,
  });
  const content = sanitizeContent(searchParams?.get("utm_content"));
  if (content) params.set("utm_content", content);
  return `/registreren?${params.toString()}`;
}

export function tiktokPromoteLandingUrl(campaign = TIKTOK_DEFAULT_CAMPAIGN): string {
  return buildTikTokLandingUrl({
    contentId: "promote",
    medium: "paid_social",
    campaignUtm: campaign,
  });
}

export { buildOrganicStartUrl, buildTikTokLandingUrl };

export { DEFAULT_STRIPE_TRIAL_DAYS as BRIDGE_TRIAL_DAYS } from "@/lib/stripe/trialConfig";
