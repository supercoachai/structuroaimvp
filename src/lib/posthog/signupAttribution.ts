import { createClient } from "@/lib/supabase/client";

const SOURCE_KEY = "signup_source";
const CAMPAIGN_KEY = "signup_utm_campaign";
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

/** Eerste paginaweergave: utm_source / ?source= in sessionStorage (first-touch). */
export function captureUtmOnFirstVisit(): void {
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

/** Schrijf acquisitie naar profiles (alleen als signup_source nog leeg is). */
export async function persistSignupAttributionToProfile(
  userId: string
): Promise<void> {
  const signupSource = getStoredSignupSource();
  const signupCampaign = getStoredSignupCampaign();

  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        signup_source: signupSource,
        signup_utm_campaign: signupCampaign,
      })
      .eq("id", userId)
      .is("signup_source", null);

    if (error) {
      console.warn("[signupAttribution] profile update failed:", error.message);
      return;
    }
    clearSignupAttributionStorage();
  } catch (e) {
    console.warn("[signupAttribution] profile update error:", e);
  }
}
