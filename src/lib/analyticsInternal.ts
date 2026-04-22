import { isProtectedTestAccount } from "@/lib/protectedTestAccount";

/**
 * Team- en testaccounts uitsluiten van product-analytics (GA4 custom events, Vercel Web Analytics, Speed Insights).
 *
 * Zet in Vercel: NEXT_PUBLIC_ANALYTICS_EXCLUDE_EMAILS met komma-gescheiden adressen (case-neutraal).
 * Het beschermde testaccount (NEXT_PUBLIC_PROTECTED_TEST_ACCOUNT_EMAIL) wordt automatisch meegenomen.
 *
 * Anoniem verkeer (niet ingelogd) wordt niet uitgesloten: dat is je doelgroep. Eigen klikken zonder login
 * kun je in GA4/Vercel met IP- of intern-verkeerfilters aanvullen.
 */

function normalizeEmailList(raw: string | undefined): Set<string> {
  const out = new Set<string>();
  if (!raw?.trim()) return out;
  for (const part of raw.split(",")) {
    const e = part.trim().toLowerCase();
    if (e) out.add(e);
  }
  return out;
}

const EXTRA_EXCLUDED_EMAILS = normalizeEmailList(
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_ANALYTICS_EXCLUDE_EMAILS
    : undefined
);

export function isAnalyticsExcludedEmail(
  email: string | null | undefined
): boolean {
  if (!email?.trim()) return false;
  const lower = email.trim().toLowerCase();
  if (isProtectedTestAccount(email)) return true;
  return EXTRA_EXCLUDED_EMAILS.has(lower);
}

let sessionExcluded = false;
let sessionResolved = false;

export function syncAnalyticsExclusionFromSessionEmail(
  email: string | null | undefined
): void {
  sessionExcluded = isAnalyticsExcludedEmail(email);
  sessionResolved = true;
}

/**
 * Custom events (gtag) en server-side-achtige hooks: na auth-check false voor interne sessies.
 * Tot de eerste auth-resolutie: true (voorkomt dat echte anonieme bezoekers events missen).
 */
export function shouldSendProductAnalytics(): boolean {
  if (!sessionResolved) return true;
  return !sessionExcluded;
}
