import {
  bridgeChannelFromPath,
  TIKTOK_BIO_DEFAULT_UTM,
} from "@/lib/acquisition/bridgePaths";
import {
  JASPER_SIGNUP_CAMPAIGN,
  JASPER_SIGNUP_SOURCE,
  isJasperLandingPath,
} from "@/lib/jasper/jasperOffer";
import { normalizeSignupSource } from "@/lib/posthog/signupAttribution";

export const ACQUISITION_VISITOR_KEY = "structuro_acq_vid";
const LANDING_SENT_PREFIX = "structuro_acq_sent_";

function sanitize(raw: string | null | undefined, max = 128): string {
  const t = (raw ?? "").trim().slice(0, max);
  if (!t) return "";
  return t.replace(/[^a-zA-Z0-9_\-./:?&=%]/g, "");
}

function sanitizePath(pathname: string): string {
  const p = pathname.trim().slice(0, 200);
  if (!p.startsWith("/")) return `/${p}`;
  return p;
}

function referrerDomain(referrer: string | null | undefined): string | null {
  if (!referrer?.trim()) return null;
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isTikTokReferrer(referrer: string | null | undefined): boolean {
  const host = referrerDomain(referrer);
  if (!host) return false;
  return host.includes("tiktok.com") || host === "vm.tiktok.com";
}

// Strikte whitelist voor TikTok-bron tokens. Bewust geen `includes("tiktok")`:
// test-utm's en typo-variaties zoals `tiktokclone` of `internal_tiktok_test` zouden
// dan ten onrechte als TikTok-acquisitie tellen en het kanaal opblazen.
const TIKTOK_SOURCE_WHITELIST = new Set([
  "tiktok",
  "tiktok_ads",
  "tiktok_bio",
  "tiktok_organic",
  "tiktok_paid",
  "tiktok_creator",
  "tiktok_creators",
  "tiktok_dm",
  "tiktok_video",
]);

function isTikTokSourceToken(raw: string | null | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return false;
  return TIKTOK_SOURCE_WHITELIST.has(v);
}

export type AcquisitionAttribution = {
  source: string;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  referrer_domain: string | null;
  is_tiktok: boolean;
  has_ttclid: boolean;
  landing_path: string;
};

export function resolveAcquisitionAttribution(input: {
  pathname: string;
  searchParams?: URLSearchParams | null;
  referrer?: string | null;
}): AcquisitionAttribution {
  const landing_path = sanitizePath(input.pathname);
  const params = input.searchParams ?? new URLSearchParams();
  const rawUtmSource = sanitize(params.get("utm_source")) || null;
  const rawUtmCampaign = sanitize(params.get("utm_campaign")) || null;
  const rawUtmMedium = sanitize(params.get("utm_medium")) || null;
  const utm_content = sanitize(params.get("utm_content")) || null;
  const legacySource = sanitize(params.get("source"));
  const has_ttclid = Boolean(sanitize(params.get("ttclid")));
  const refDomain = referrerDomain(input.referrer);

  const fromTikTokRoute = bridgeChannelFromPath(landing_path) === "tiktok";
  // Organic EU productiepad (tot cutover): /v2/onboarding.
  const fromV2OrganicEntry =
    landing_path === "/v2/onboarding" ||
    landing_path.startsWith("/v2/onboarding/");
  const fromOrganicRoute =
    bridgeChannelFromPath(landing_path) === "organic" || fromV2OrganicEntry;
  const fromJasperRoute = isJasperLandingPath(landing_path);

  // Kale /tiktok bio-link: geen eigen utm_source/source en geen ttclid in de URL.
  // Behandel als TikTok-bio-verkeer met defaults, zonder bestaande params te overschrijven.
  const isBareTikTokBio =
    fromTikTokRoute && !rawUtmSource && !legacySource && !has_ttclid;

  // Kale /jasper podcast-link: geen utm_source en geen legacy ?source=.
  // Behandel als podcast-verkeer met Jasper-defaults.
  const isBareJasper = fromJasperRoute && !rawUtmSource && !legacySource;

  const utm_source =
    rawUtmSource ||
    (isBareTikTokBio ? TIKTOK_BIO_DEFAULT_UTM.utm_source : null) ||
    (isBareJasper ? JASPER_SIGNUP_SOURCE : null);
  const utm_campaign =
    rawUtmCampaign ||
    (isBareTikTokBio ? TIKTOK_BIO_DEFAULT_UTM.utm_campaign : null) ||
    (isBareJasper ? JASPER_SIGNUP_CAMPAIGN : null);
  const utm_medium =
    rawUtmMedium ||
    (isBareTikTokBio ? TIKTOK_BIO_DEFAULT_UTM.utm_medium : null) ||
    (isBareJasper ? "podcast" : null);

  const is_tiktok =
    has_ttclid ||
    isTikTokSourceToken(utm_source) ||
    isTikTokSourceToken(legacySource) ||
    isTikTokReferrer(input.referrer) ||
    fromTikTokRoute;

  let source =
    utm_source ||
    legacySource ||
    (isTikTokReferrer(input.referrer) ? "tiktok" : "") ||
    (fromTikTokRoute ? "tiktok" : "") ||
    (fromOrganicRoute ? "structuro_eu" : "") ||
    (fromJasperRoute ? JASPER_SIGNUP_SOURCE : "") ||
    "direct";

  if (is_tiktok && source === "direct") {
    source = "tiktok";
  }

  return {
    source: normalizeSignupSource(source),
    utm_source,
    utm_campaign,
    utm_medium,
    utm_content,
    referrer_domain: refDomain,
    is_tiktok,
    has_ttclid,
    landing_path,
  };
}

export function getOrCreateAcquisitionVisitorId(): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  try {
    const existing = sessionStorage.getItem(ACQUISITION_VISITOR_KEY);
    if (existing && existing.length >= 8) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(ACQUISITION_VISITOR_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function hasAcquisitionLandingBeenTracked(pathname: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(`${LANDING_SENT_PREFIX}${sanitizePath(pathname)}`) === "1";
  } catch {
    return false;
  }
}

export function markAcquisitionLandingTracked(pathname: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${LANDING_SENT_PREFIX}${sanitizePath(pathname)}`, "1");
  } catch {
    /* ignore */
  }
}
