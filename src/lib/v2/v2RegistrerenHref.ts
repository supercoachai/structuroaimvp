import {
  getStoredSignupCampaign,
  getStoredSignupSource,
} from "@/lib/posthog/signupAttribution";

/**
 * Echte account-brug vanuit V2 (local journey) naar productie-/registreren,
 * met behoud van acquisitie-attributie.
 */
export function buildV2RegistrerenHref(opts?: {
  content?: string;
}): string {
  const params = new URLSearchParams();
  const source = getStoredSignupSource();
  if (source && source !== "direct") {
    params.set("source", source);
    params.set("utm_source", source);
  } else {
    params.set("source", "structuro_eu");
    params.set("utm_source", "structuro_eu");
  }
  const campaign = getStoredSignupCampaign();
  if (campaign) params.set("utm_campaign", campaign);
  else params.set("utm_campaign", "eu_v2");
  params.set("utm_medium", "organic");
  if (opts?.content) params.set("utm_content", opts.content);
  params.set("from", "v2");
  return `/registreren?${params.toString()}`;
}
