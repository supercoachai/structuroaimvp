/**
 * Proefperiode voor nieuwe Stripe-abonnementen (betaalmethode vooraf, daarna auto-incasso).
 *
 * Standaard: 3 dagen. Event-kanalen (QR) kunnen een langere trial krijgen via signup_source.
 */

export const DEFAULT_STRIPE_TRIAL_DAYS = 3;

/** Whitelist: signup_source → trial-dagen (server-side, geen client-trust). */
export const EVENT_TRIAL_BY_SIGNUP_SOURCE: Record<
  string,
  { days: number; validUntilYmd?: string }
> = {
  adhd_cafe: { days: 14, validUntilYmd: "2026-12-31" },
};

export function normalizeSignupSourceKey(
  raw: string | null | undefined
): string | null {
  const t = (raw ?? "").trim().toLowerCase();
  if (!t) return null;
  const safe = t.replace(/[^a-z0-9_]/g, "");
  return safe || null;
}

function todayYmdUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Bepaal trial-dagen voor registratie-checkout op basis van profiles.signup_source. */
export function resolveStripeTrialDaysForSignupSource(
  signupSource: string | null | undefined
): number {
  const key = normalizeSignupSourceKey(signupSource);
  if (!key) return DEFAULT_STRIPE_TRIAL_DAYS;

  const event = EVENT_TRIAL_BY_SIGNUP_SOURCE[key];
  if (!event) return DEFAULT_STRIPE_TRIAL_DAYS;

  if (event.validUntilYmd && todayYmdUtc() > event.validUntilYmd) {
    return DEFAULT_STRIPE_TRIAL_DAYS;
  }

  return event.days;
}

/** Publieke URL voor ADHD-café QR (productie). */
export const ADHD_CAFE_PUBLIC_PATH = "/adhd-cafe";

export const ADHD_CAFE_SIGNUP_SOURCE = "adhd_cafe";
export const ADHD_CAFE_SIGNUP_CAMPAIGN = "cafe_qr_2026";

/** Directe redirect vanaf /adhd-cafe naar registratie met event-attributie. */
export const ADHD_CAFE_REGISTREREN_PATH =
  `/registreren?source=${ADHD_CAFE_SIGNUP_SOURCE}&utm_campaign=${ADHD_CAFE_SIGNUP_CAMPAIGN}` as const;

export function isEventSignupSource(
  signupSource: string | null | undefined
): boolean {
  const key = normalizeSignupSourceKey(signupSource);
  if (!key) return false;
  return key in EVENT_TRIAL_BY_SIGNUP_SOURCE;
}

export function getAdhdCafePublicUrl(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${ADHD_CAFE_PUBLIC_PATH}`;
}
