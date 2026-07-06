/**
 * Proefperiode voor nieuwe Stripe-abonnementen (betaalmethode vooraf, daarna auto-incasso).
 *
 * Standaard: 3 dagen. Event-kanalen (QR) kunnen een langere trial krijgen via signup_source.
 */

export const DEFAULT_STRIPE_TRIAL_DAYS = 3;

/**
 * Whitelist: signup_source → trial-dagen (server-side, geen client-trust).
 *
 * BELANGRIJK: de cron expire_trials() gebruikt de SQL-spiegel
 * `profile_has_active_app_trial` in Supabase. Nieuwe bron hier toevoegen =
 * ook een migratie schrijven die die functie bijwerkt (zie
 * supabase/migrations/20260706130000_trial_days_jasper_podcast.sql), anders
 * kapt de cron de trial na de default 3 dagen af.
 *
 * Compensatie per account (bugfix): zet profiles.app_trial_override_until via
 * service_role. Die kolom wint in profile_has_active_app_trial en in de app
 * (hasActiveAppTrialOverride) tot het moment verstreken is.
 */
export const EVENT_TRIAL_BY_SIGNUP_SOURCE: Record<
  string,
  { days: number; validUntilYmd?: string }
> = {
  adhd_cafe: { days: 14, validUntilYmd: "2026-12-31" },
  // Podcast met Jasper: evergreen, geen einddatum. Aanbieding loopt door tot
  // expliciet uitgezet. Stripe-korting (3 maanden) wordt apart afgehandeld via
  // src/lib/jasper/jasperOffer.ts (coupon op subscription).
  jasper_podcast: { days: 7 },
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
