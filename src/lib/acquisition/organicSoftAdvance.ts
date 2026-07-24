/**
 * Soft-advance vanaf /start: EU-landing CTA's schrijven attributie en gaan
 * door naar onboarding zonder tweede klik op de leesbare bridge.
 *
 * Destinations:
 * - eu_v2* → /v2/onboarding (zelfde UX als EU v2-landing)
 * - website* / waitlist_legacy → /onboarding (v1; main + cyclus + legacy)
 *
 * Kale /start zonder herkende campaign blijft leesbaar (geen soft-advance).
 * TikTok /tiktok blijft leesbaar (aparte channel-gate in de client).
 */

export type OrganicSoftAdvanceTarget = "/v2/onboarding" | "/onboarding";

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
  searchParams: URLSearchParams
): OrganicSoftAdvanceTarget {
  const campaign = campaignFromSearchParams(searchParams);
  if (isEuV2OrganicCampaign(campaign)) return "/v2/onboarding";
  return "/onboarding";
}

/** Soft-advance behoudt lang; attributie zit al in storage/cookie vanaf /start. */
export function softAdvanceHref(
  signupHref: string,
  searchParams: URLSearchParams
): string {
  const lang = searchParams.get("lang") || searchParams.get("locale");
  if (!lang || (lang !== "en" && lang !== "nl")) return signupHref;
  const next = new URL(signupHref, "https://www.structuro.ai");
  next.searchParams.set("lang", lang);
  return `${next.pathname}?${next.searchParams.toString()}`;
}
