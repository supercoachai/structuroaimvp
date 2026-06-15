import { DEFAULT_STRIPE_TRIAL_DAYS } from "@/lib/stripe/trialConfig";

export const TIKTOK_SIGNUP_SOURCE = "tiktok";
export const TIKTOK_DEFAULT_CAMPAIGN = "tiktok_promote";
export const TIKTOK_DEFAULT_MEDIUM = "paid_social";

/** Publieke TikTok-landingspagina (Promote + bio-link). */
export const TIKTOK_LANDING_PATH = "/tiktok";

type SearchParamsLike = {
  get(name: string): string | null;
  toString(): string;
};

function sanitizeCampaign(raw: string | null | undefined): string {
  const t = (raw ?? "").trim().slice(0, 64);
  if (!t) return TIKTOK_DEFAULT_CAMPAIGN;
  return t.replace(/[^a-zA-Z0-9_-]/g, "") || TIKTOK_DEFAULT_CAMPAIGN;
}

/** Registratie-URL met vaste TikTok-attributie; behoudt utm_campaign uit de ad-URL. */
export function buildTikTokRegistrerenHref(
  searchParams?: SearchParamsLike | null
): string {
  const campaign = sanitizeCampaign(searchParams?.get("utm_campaign"));
  const params = new URLSearchParams({
    source: TIKTOK_SIGNUP_SOURCE,
    utm_source: TIKTOK_SIGNUP_SOURCE,
    utm_medium: TIKTOK_DEFAULT_MEDIUM,
    utm_campaign: campaign,
  });
  const video = searchParams?.get("utm_content")?.trim();
  if (video) {
    params.set("utm_content", video.slice(0, 64).replace(/[^a-zA-Z0-9_-]/g, ""));
  }
  return `/registreren?${params.toString()}`;
}

export function tiktokPromoteLandingUrl(campaign = TIKTOK_DEFAULT_CAMPAIGN): string {
  const params = new URLSearchParams({
    utm_source: TIKTOK_SIGNUP_SOURCE,
    utm_medium: TIKTOK_DEFAULT_MEDIUM,
    utm_campaign: campaign,
  });
  return `https://www.structuro.ai${TIKTOK_LANDING_PATH}?${params.toString()}`;
}

export { DEFAULT_STRIPE_TRIAL_DAYS as TIKTOK_TRIAL_DAYS } from "@/lib/stripe/trialConfig";
export { buildTikTokLandingUrl } from "@/lib/tiktok/lpConfig";
