import {
  bridgePathForChannel,
  buildBridgeRegistrerenHref,
  buildOrganicStartUrl,
  buildTikTokLandingUrl,
  ORGANIC_BRIDGE_PATH,
  ORGANIC_DEFAULT_CAMPAIGN,
  ORGANIC_DEFAULT_MEDIUM,
  ORGANIC_SIGNUP_SOURCE,
  TIKTOK_BRIDGE_PATH,
  TIKTOK_DEFAULT_CAMPAIGN,
  TIKTOK_DEFAULT_MEDIUM,
  TIKTOK_SIGNUP_SOURCE,
  tiktokPromoteLandingUrl,
} from "@/lib/acquisition/bridgePaths";

export const TIKTOK_LANDING_PATH = TIKTOK_BRIDGE_PATH;
export { TIKTOK_SIGNUP_SOURCE, TIKTOK_DEFAULT_CAMPAIGN, TIKTOK_DEFAULT_MEDIUM };

/** @deprecated Gebruik buildBridgeRegistrerenHref("tiktok", …). */
export function buildTikTokRegistrerenHref(
  searchParams?: Parameters<typeof buildBridgeRegistrerenHref>[1]
): string {
  return buildBridgeRegistrerenHref("tiktok", searchParams);
}

export { tiktokPromoteLandingUrl, buildTikTokLandingUrl, buildOrganicStartUrl };

export {
  ORGANIC_BRIDGE_PATH,
  ORGANIC_SIGNUP_SOURCE,
  ORGANIC_DEFAULT_CAMPAIGN,
  ORGANIC_DEFAULT_MEDIUM,
  bridgePathForChannel,
};

export { DEFAULT_STRIPE_TRIAL_DAYS as TIKTOK_TRIAL_DAYS } from "@/lib/stripe/trialConfig";
