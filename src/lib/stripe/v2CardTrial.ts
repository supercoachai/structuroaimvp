/**
 * V2-cohort vanaf deze cutoff: geen gratis app-trial zonder kaart.
 * Na eerste dagstart + account → Stripe Checkout met 7 dagen trial + PM.
 * Oudere accounts houden de bestaande free-trial logica.
 * Event-kanalen (jasper_podcast, adhd_cafe): géén kaart verplicht tijdens app-trial.
 */
import { readCheckoutBonusTrialDays } from "@/lib/stripe/checkoutBonusTrialDays";
import { isEventSignupSource } from "@/lib/stripe/trialConfig";

export const V2_CARD_TRIAL_CUTOFF_ISO = "2026-07-28T08:00:00.000Z";

/** Standaard Stripe-trial voor nieuwe v2 card-cohort. */
export const V2_CARD_TRIAL_DAYS = 7;

const AMSTERDAM_TZ = "Europe/Amsterdam";

/**
 * Eerste afschrijving na Stripe `trial_period_days` (zelfde offset als checkout:
 * nu + N × 24u). Gebruikt voor paywall-copy; niet cachen over navigaties heen.
 */
export function getV2CardTrialChargeAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + V2_CARD_TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

/** Leesbare afschrijfdatum in Europe/Amsterdam (NL of EN), zonder kloktijd. */
export function formatV2CardTrialChargeLabel(
  now: Date = new Date(),
  locale: "nl" | "en" = "nl"
): string {
  const chargeAt = getV2CardTrialChargeAt(now);
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", {
    timeZone: AMSTERDAM_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(chargeAt);
}

export function isV2CardTrialCohort(
  createdAt: string | null | undefined
): boolean {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return t >= new Date(V2_CARD_TRIAL_CUTOFF_ISO).getTime();
}

/**
 * Heeft deze user de v2-kaart-trial al gestart (Stripe trialing/active/cancelled-in-period)?
 */
export function hasStripeTrialOrPaidAccess(row: {
  subscription_status?: string | null;
  subscription_current_period_end?: string | null;
}): boolean {
  const status = (row.subscription_status ?? "").toLowerCase();
  if (status === "active" || status === "trialing") return true;
  if (status === "cancelled" || status === "canceled") {
    const end = row.subscription_current_period_end
      ? new Date(row.subscription_current_period_end).getTime()
      : NaN;
    return Number.isFinite(end) && end > Date.now();
  }
  return false;
}

/**
 * Eerste Stripe-checkout voor v2 card-cohort: komt 7 dagen trial toe.
 * Belangrijk: `trial_expired` telt mee. expire_trials kan `none` →
 * `trial_expired` zetten vóór de kaart-checkout; die users moeten nog
 * steeds €0 vandaag zien, niet meteen €12,99.
 */
export function isFreshV2CardTrialCheckout(row: {
  created_at?: string | null;
  subscription_status?: string | null;
  subscription_current_period_end?: string | null;
  signup_source?: string | null;
}): boolean {
  if (!isV2CardTrialCohort(row.created_at)) return false;
  // Jasper / café-QR: 7d (of 14d) app-trial zonder kaart.
  if (isEventSignupSource(row.signup_source)) return false;
  if (hasStripeTrialOrPaidAccess(row)) return false;
  return true;
}

/** True als v2-user in nieuwe cohort nog checkout moet doen. */
export function requiresV2CardTrialCheckout(row: {
  created_at?: string | null;
  last_dagstart_date?: string | null;
  subscription_status?: string | null;
  subscription_current_period_end?: string | null;
  signup_source?: string | null;
}): boolean {
  if (!isFreshV2CardTrialCheckout(row)) return false;
  // Eerst waarde (dagstart) vóór de kaart-poort.
  if (!row.last_dagstart_date?.trim()) return false;
  return true;
}

/**
 * Trial-dagen voor Checkout Session / wallet-subscribe.
 * V2 card-cohort (eerste keer): max(7, bonus). Anders alleen bonus (meestal 0).
 */
export function resolveV2CardCheckoutTrialDays(
  profile:
    | {
        created_at?: string | null;
        subscription_status?: string | null;
        subscription_current_period_end?: string | null;
        signup_source?: string | null;
        checkout_bonus_trial_days?: unknown;
      }
    | null
    | undefined
): { trialDays: number; freshV2CardTrial: boolean } {
  const bonus = readCheckoutBonusTrialDays(profile);
  if (profile && isFreshV2CardTrialCheckout(profile)) {
    return {
      trialDays: Math.max(V2_CARD_TRIAL_DAYS, bonus),
      freshV2CardTrial: true,
    };
  }
  return { trialDays: bonus, freshV2CardTrial: false };
}
