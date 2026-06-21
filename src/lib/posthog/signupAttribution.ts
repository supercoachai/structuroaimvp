import { createClient } from "@/lib/supabase/client";
import { ORGANIC_SIGNUP_SOURCE } from "@/lib/acquisition/bridgePaths";
import {
  EVENT_TRIAL_BY_SIGNUP_SOURCE,
  normalizeSignupSourceKey,
  resolveStripeTrialDaysForSignupSource,
} from "@/lib/stripe/trialConfig";
import { captureFirstTouchAttribution } from "@/lib/posthog/firstTouchAttribution";

export const SOURCE_KEY = "signup_source";
export const CAMPAIGN_KEY = "signup_utm_campaign";
export const PENDING_SIGNUP_KEY = "structuro_pending_signup";
const LEGACY_KEY = "STRUCTURO_ATTRIBUTION_SOURCE";

function sanitizeAttributionValue(
  raw: string | null | undefined,
  max = 64
): string {
  const t = (raw ?? "").trim().slice(0, max);
  if (!t) return "";
  return t.replace(/[^a-zA-Z0-9_-]/g, "");
}

/** Eerste paginaweergave: utm_source / ?source= in sessionStorage + st_attr cookie. */
export function captureUtmOnFirstVisit(): void {
  captureFirstTouchAttribution();
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(SOURCE_KEY)) return;

    const params = new URLSearchParams(window.location.search);
    const fromUtm = sanitizeAttributionValue(params.get("utm_source"));
    const fromLegacySource = sanitizeAttributionValue(params.get("source"));
    const source = fromUtm || fromLegacySource;
    const campaign = sanitizeAttributionValue(params.get("utm_campaign"));

    if (source) {
      sessionStorage.setItem(SOURCE_KEY, source);
      if (campaign) sessionStorage.setItem(CAMPAIGN_KEY, campaign);
      return;
    }

    const legacy = sessionStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const normalized = sanitizeAttributionValue(legacy) || "direct";
      sessionStorage.setItem(SOURCE_KEY, normalized);
    }
  } catch {
    /* ignore */
  }
}

export function getStoredSignupSource(): string {
  if (typeof window === "undefined") return "direct";
  try {
    return sessionStorage.getItem(SOURCE_KEY) || "direct";
  } catch {
    return "direct";
  }
}

export function getStoredSignupCampaign(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const c = sessionStorage.getItem(CAMPAIGN_KEY);
    return c && c.trim() ? c : null;
  } catch {
    return null;
  }
}

export function clearSignupAttributionStorage(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SOURCE_KEY);
    sessionStorage.removeItem(CAMPAIGN_KEY);
    sessionStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

export function normalizeSignupSource(raw: string | null | undefined): string {
  const s = sanitizeAttributionValue(raw);
  return s || "direct";
}

type SearchParamsLike = {
  get(name: string): string | null;
};

/**
 * URL-params op /registreren: event-bronnen (QR) overschrijven altijd;
 * overige bronnen alleen bij eerste touch.
 */
export function applySignupAttributionFromSearchParams(
  params: SearchParamsLike | null | undefined
): void {
  if (!params) return;
  const fromUtm = sanitizeAttributionValue(params.get("utm_source"));
  const fromSource = sanitizeAttributionValue(params.get("source"));
  const source = fromUtm || fromSource;
  const campaign = sanitizeAttributionValue(params.get("utm_campaign"));
  const key = normalizeSignupSourceKey(source);

  if (key && key in EVENT_TRIAL_BY_SIGNUP_SOURCE) {
    captureEventSignupSource(key, campaign || null);
    return;
  }

  // /registreren met expliciete UTM/source: URL wint (geen stale tiktok in sessionStorage).
  if (
    key &&
    typeof window !== "undefined" &&
    (window.location.pathname === "/registreren" ||
      window.location.pathname.startsWith("/registreren/"))
  ) {
    try {
      sessionStorage.setItem(SOURCE_KEY, key);
      if (campaign) sessionStorage.setItem(CAMPAIGN_KEY, campaign);
      else sessionStorage.removeItem(CAMPAIGN_KEY);
    } catch {
      /* ignore */
    }
    return;
  }

  captureUtmOnFirstVisit();
  persistSignupSourceFromUrl(source || null);
}

/** Story Layer op /registreren: organic EU in URL, geen tiktok in URL. */
export function isOrganicEuSignupFromParams(
  params: SearchParamsLike | null | undefined
): boolean {
  if (!params) return false;
  const utm = sanitizeAttributionValue(params.get("utm_source"));
  const legacy = sanitizeAttributionValue(params.get("source"));
  if (utm === "tiktok" || legacy === "tiktok") return false;
  return utm === ORGANIC_SIGNUP_SOURCE || legacy === ORGANIC_SIGNUP_SOURCE;
}

/** TikTok-attributie in URL op /registreren. */
export function isTikTokSignupFromParams(
  params: SearchParamsLike | null | undefined
): boolean {
  if (!params) return false;
  const utm = sanitizeAttributionValue(params.get("utm_source"));
  const legacy = sanitizeAttributionValue(params.get("source"));
  if (utm === ORGANIC_SIGNUP_SOURCE || legacy === ORGANIC_SIGNUP_SOURCE) return false;
  return utm === "tiktok" || legacy === "tiktok";
}

export type RegistrerenPresentation = {
  /** Story Layer (cream, Newsreader). Altijd op acquisitie; alleen event-QR = work. */
  storyVisual: boolean;
  /** Acquisition copy i.p.v. generieke proefperiode-headline. */
  isAcquisitionCopy: boolean;
  isEventFlow: boolean;
};

/**
 * Visuele presentatie op /registreren: alleen uit URL (incognito = zelfde als normale browser).
 * Geen sessionStorage/referrer: voorkomt flip na mount en stale storage in normale browser.
 */
export function resolveRegistrerenPresentation(
  params: SearchParamsLike | null | undefined
): RegistrerenPresentation {
  const utm = sanitizeAttributionValue(params?.get("utm_source"));
  const legacy = sanitizeAttributionValue(params?.get("source"));
  const sourceKey = normalizeSignupSourceKey(utm || legacy);

  if (sourceKey && sourceKey in EVENT_TRIAL_BY_SIGNUP_SOURCE) {
    return {
      storyVisual: false,
      isAcquisitionCopy: false,
      isEventFlow: true,
    };
  }

  return {
    storyVisual: true,
    isAcquisitionCopy: true,
    isEventFlow: false,
  };
}

/** Event-landingspagina's (QR): overschrijf bron zodat trial-promo altijd geldt. */
export function captureEventSignupSource(
  source: string,
  campaign?: string | null
): void {
  if (typeof window === "undefined") return;
  try {
    const s = sanitizeAttributionValue(source);
    if (!s) return;
    sessionStorage.setItem(SOURCE_KEY, s);
    const c = sanitizeAttributionValue(campaign ?? "");
    if (c) sessionStorage.setItem(CAMPAIGN_KEY, c);
  } catch {
    /* ignore */
  }
}

/** Login/registreren: expliciete ?source= als er nog geen first-touch is. */
export function persistSignupSourceFromUrl(source: string | null | undefined) {
  captureUtmOnFirstVisit();
  if (!source) return;
  try {
    if (sessionStorage.getItem(SOURCE_KEY)) return;
    const s = sanitizeAttributionValue(source);
    if (s) sessionStorage.setItem(SOURCE_KEY, s);
  } catch {
    /* ignore */
  }
}

export function getSignupAttributionSource(): string {
  return getStoredSignupSource();
}

export function isAcquisitionSignupContext(): boolean {
  if (typeof window === "undefined") return false;

  const source = getStoredSignupSource();
  if (source && source !== "direct" && source !== "tiktok") return true;

  try {
    const params = new URLSearchParams(window.location.search);
    const utm = params.get("utm_source");
    const legacy = params.get("source");
    if (utm && utm !== "tiktok") return true;
    if (legacy && legacy !== "tiktok") return true;
  } catch {
    /* ignore */
  }

  try {
    const ref = document.referrer;
    if (!ref) return false;
    if (/structuro\.eu/i.test(ref)) return true;
    if (/\/start(?:\?|$|\/)/i.test(ref)) return true;
  } catch {
    /* ignore */
  }

  return false;
}

/** structuro.eu → /start → /registreren: Story Layer styling, geen proefdagen-copy. */
export function isOrganicEuSignupContext(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const params = new URLSearchParams(window.location.search);
    if (isOrganicEuSignupFromParams(params)) return true;
  } catch {
    /* ignore */
  }

  return getStoredSignupSource() === ORGANIC_SIGNUP_SOURCE;
}

/** TikTok-bridge of TikTok-attributie: scherpere copy op /registreren. */
export function isTikTokSignupContext(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const params = new URLSearchParams(window.location.search);
    const utm = params.get("utm_source");
    const legacy = params.get("source");
    if (utm === ORGANIC_SIGNUP_SOURCE || legacy === ORGANIC_SIGNUP_SOURCE) return false;
    if (utm === "tiktok" || legacy === "tiktok") return true;
  } catch {
    /* ignore */
  }

  const source = getStoredSignupSource();
  if (source === "tiktok") return true;

  try {
    const ref = document.referrer;
    if (ref && /\/tiktok(?:\?|$|\/)/i.test(ref)) return true;
  } catch {
    /* ignore */
  }

  return false;
}

export function queueSignupCompletedForAnalytics() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      PENDING_SIGNUP_KEY,
      JSON.stringify({
        source: getStoredSignupSource(),
        utm_campaign: getStoredSignupCampaign(),
      })
    );
  } catch {
    /* ignore */
  }
}

/** Trial-dagen: profiel/metadata zijn leidend; sessionStorage alleen als fallback. */
export function resolveRegistrationTrialDays(
  profileSignupSource: string | null | undefined,
  userMetadata: Record<string, unknown> | null | undefined,
  fallbackSessionSource?: string | null
): number {
  const source =
    resolveProfileSignupSource(profileSignupSource, userMetadata) ??
    normalizeSignupSourceKey(fallbackSessionSource) ??
    null;
  return resolveStripeTrialDaysForSignupSource(source);
}

/** Bron voor trial/checkout: profiel, anders auth metadata bij signup. */
export function resolveProfileSignupSource(
  profileSignupSource: string | null | undefined,
  userMetadata: Record<string, unknown> | null | undefined
): string | null {
  const fromProfile = (profileSignupSource ?? "").trim();
  if (fromProfile) return fromProfile;

  const fromMeta = userMetadata?.signup_source;
  if (typeof fromMeta === "string" && fromMeta.trim()) {
    return fromMeta.trim();
  }
  return null;
}

/** Schrijf acquisitie naar profiles (alleen als signup_source nog leeg is). */
export async function persistSignupAttributionToProfile(
  userId: string
): Promise<boolean> {
  const signupSource = getStoredSignupSource();
  const signupCampaign = getStoredSignupCampaign();
  const maxAttempts = 8;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .update({
          signup_source: signupSource,
          signup_utm_campaign: signupCampaign,
        })
        .eq("id", userId)
        .is("signup_source", null)
        .select("id");

      if (error) {
        console.warn("[signupAttribution] profile update failed:", error.message);
        return false;
      }

      if (data && data.length > 0) {
        clearSignupAttributionStorage();
        return true;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("signup_source")
        .eq("id", userId)
        .maybeSingle();

      if ((profile?.signup_source as string | null | undefined)?.trim()) {
        clearSignupAttributionStorage();
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    } catch (e) {
      console.warn("[signupAttribution] profile update error:", e);
      if (attempt === maxAttempts - 1) return false;
    }
  }

  return false;
}
