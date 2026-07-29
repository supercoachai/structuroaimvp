/**
 * Soft-advance helpers (legacy /start-pad).
 *
 * Organische EU-CTA's gaan nu direct naar `/onboarding` (landing + next.config
 * redirect van `/start`). Deze helpers blijven beschikbaar voor residual
 * soft-advance in AcquisitionBridgeClient als `/start` ooit nog client-side
 * landt. TikTok `/tiktok` blijft leesbaar (aparte channel-gate).
 */

export type OrganicSoftAdvanceTarget = "/onboarding";

function campaignFromSearchParams(searchParams: URLSearchParams): string {
  return (searchParams.get("utm_campaign") || "").trim().toLowerCase();
}

export function isEuV2OrganicCampaign(campaign: string): boolean {
  return campaign === "eu_v2" || campaign.startsWith("eu_v2_");
}

export function isWebsiteOrganicCampaign(campaign: string): boolean {
  return (
    campaign === "website" ||
    campaign.startsWith("website_") ||
    campaign === "waitlist_legacy"
  );
}

/** Soft-advance voor herkende EU-organic campaigns op /start. */
export function shouldSoftAdvanceOrganicLanding(
  searchParams: URLSearchParams
): boolean {
  const campaign = campaignFromSearchParams(searchParams);
  return isEuV2OrganicCampaign(campaign) || isWebsiteOrganicCampaign(campaign);
}

export function organicSoftAdvanceTarget(
  _searchParams: URLSearchParams
): OrganicSoftAdvanceTarget {
  return "/onboarding";
}

/**
 * Soft-advance behoudt lang + first-touch UTM's zodat attributie niet
 * alleen op sessionStorage leunt (nieuwe tab / cookie-loss).
 */
export function softAdvanceHref(
  signupHref: string,
  searchParams: URLSearchParams
): string {
  const next = new URL(signupHref, "https://www.structuro.ai");
  const lang = searchParams.get("lang") || searchParams.get("locale");
  if (lang === "en" || lang === "nl") {
    next.searchParams.set("lang", lang);
  }
  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "source",
    "_ph_did",
  ]) {
    const value = searchParams.get(key);
    if (value) next.searchParams.set(key, value);
  }
  const qs = next.searchParams.toString();
  return qs ? `${next.pathname}?${qs}` : next.pathname;
}
