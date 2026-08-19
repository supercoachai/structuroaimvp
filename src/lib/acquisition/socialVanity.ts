/**
 * Korte typebare social-URL's (structuro.eu/tiktok, /instagram) landen op
 * dezelfde anonieme dagstart. Alleen utm_source verschilt, zodat Supabase
 * signup_source tiktok vs instagram uit elkaar houdt.
 *
 * Publieke URL is altijd .eu. structuro.ai/tiktok en /instagram zijn alleen hops.
 * Geen import uit bridgePaths: die trekt lpConfig mee, te zwaar voor Edge.
 */

export const SOCIAL_VANITY_SOURCES = ["tiktok", "instagram"] as const;
export type SocialVanitySource = (typeof SOCIAL_VANITY_SOURCES)[number];

const ORGANIC_ENTRY_PATH = "/onboarding";

const DEFAULTS: Record<
  SocialVanitySource,
  { utm_source: string; utm_medium: string; utm_campaign: string; utm_content: string }
> = {
  tiktok: {
    utm_source: "tiktok",
    utm_medium: "organic",
    utm_campaign: "tiktok_bio",
    utm_content: "eu_vanity",
  },
  instagram: {
    utm_source: "instagram",
    utm_medium: "organic",
    utm_campaign: "ig_bio",
    utm_content: "eu_vanity",
  },
};

export function isSocialVanitySource(
  raw: string | null | undefined
): raw is SocialVanitySource {
  return raw === "tiktok" || raw === "instagram";
}

export function isOrganicEuUtmSource(
  searchParams?: URLSearchParams | null
): boolean {
  const source = (searchParams?.get("utm_source") ?? "").trim().toLowerCase();
  return source === "structuro_eu" || source === "structuro.eu";
}

function isEnTikTokPath(pathname: string): boolean {
  return pathname === "/en/tiktok" || pathname.startsWith("/en/tiktok/");
}

function isAiTikTokPath(pathname: string): boolean {
  return pathname === "/tiktok" || pathname.startsWith("/tiktok/") || isEnTikTokPath(pathname);
}

/** /tiktok, /en/tiktok, /social/tiktok, /instagram. Niet /activiteit/tiktok-publish. */
export function socialVanitySourceFromPath(
  pathname: string | null | undefined
): SocialVanitySource | null {
  if (!pathname) return null;
  if (pathname === "/social/tiktok" || pathname.startsWith("/social/tiktok/")) {
    return "tiktok";
  }
  if (
    pathname === "/social/instagram" ||
    pathname.startsWith("/social/instagram/")
  ) {
    return "instagram";
  }
  if (pathname === "/instagram" || pathname.startsWith("/instagram/")) {
    return "instagram";
  }
  if (isAiTikTokPath(pathname)) return "tiktok";
  return null;
}

/** Zet bron vast; vult medium/campaign/content alleen als ze ontbreken. */
export function buildSocialVanityOnboardingPath(
  source: SocialVanitySource,
  incoming?: URLSearchParams | null
): string {
  const params = new URLSearchParams(incoming?.toString() ?? "");
  const defaults = DEFAULTS[source];
  params.set("utm_source", defaults.utm_source);
  if (!params.get("utm_medium")) params.set("utm_medium", defaults.utm_medium);
  if (!params.get("utm_campaign")) {
    params.set("utm_campaign", defaults.utm_campaign);
  }
  if (!params.get("utm_content")) params.set("utm_content", defaults.utm_content);
  return `${ORGANIC_ENTRY_PATH}?${params.toString()}`;
}

/**
 * HTTP-hop naar /onboarding. Legacy /tiktok?utm_source=structuro_eu blijft EU,
 * zodat organische CTA's niet als TikTok worden gemeten.
 */
export function buildSocialVanityRedirectPath(
  pathname: string,
  incoming?: URLSearchParams | null
): string | null {
  const source = socialVanitySourceFromPath(pathname);
  if (!source) return null;

  const params = new URLSearchParams(incoming?.toString() ?? "");
  if (isEnTikTokPath(pathname) && !params.get("lang") && !params.get("locale")) {
    params.set("lang", "en");
  }

  if (source === "tiktok" && isAiTikTokPath(pathname) && isOrganicEuUtmSource(params)) {
    const qs = params.toString();
    return qs ? `${ORGANIC_ENTRY_PATH}?${qs}` : ORGANIC_ENTRY_PATH;
  }

  return buildSocialVanityOnboardingPath(source, params);
}
