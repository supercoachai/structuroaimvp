const ATTRIBUTION_KEY = "STRUCTURO_ATTRIBUTION_SOURCE";
const PENDING_SIGNUP_KEY = "structuro_pending_signup";

const ALLOWED = new Set(["landing", "direct", "linkedin"]);

export function normalizeSignupSource(
  raw: string | null | undefined
): "landing" | "direct" | "linkedin" {
  const s = (raw ?? "direct").trim().toLowerCase();
  if (ALLOWED.has(s)) return s as "landing" | "direct" | "linkedin";
  return "direct";
}

export function persistSignupSourceFromUrl(source: string | null | undefined) {
  if (typeof window === "undefined") return;
  const n = normalizeSignupSource(source);
  try {
    sessionStorage.setItem(ATTRIBUTION_KEY, n);
  } catch {
    /* ignore */
  }
}

export function getSignupAttributionSource(): "landing" | "direct" | "linkedin" {
  if (typeof window === "undefined") return "direct";
  try {
    return normalizeSignupSource(sessionStorage.getItem(ATTRIBUTION_KEY));
  } catch {
    return "direct";
  }
}

export function queueSignupCompletedForAnalytics() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      PENDING_SIGNUP_KEY,
      JSON.stringify({ source: getSignupAttributionSource() })
    );
  } catch {
    /* ignore */
  }
}
