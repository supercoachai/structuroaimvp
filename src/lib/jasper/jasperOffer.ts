/**
 * Aanbieding voor luisteraars van de podcast met Jasper.
 *
 * Funnel:
 *   /jasper (landingspage met aanbieding)
 *     -> /onboarding (anonieme dagstart, zelfde flow als /tiktok en /start)
 *     -> /registreren (account aanmaken, signup_source=jasper_podcast)
 *     -> 7 dagen gratis in-app proeftijd (via EVENT_TRIAL_BY_SIGNUP_SOURCE)
 *     -> /abonnement na trial-einde
 *     -> Stripe checkout met Jasper-kortingscoupon: eerste 3 maanden EUR 7,99
 *     -> maand 4+: normaal maandelijks bedrag (EUR 12,99)
 */

import { normalizeSignupSourceKey } from "@/lib/stripe/trialConfig";

export const JASPER_SIGNUP_SOURCE = "jasper_podcast";
export const JASPER_SIGNUP_CAMPAIGN = "jasper_podcast";
export const JASPER_LANDING_PATH = "/jasper";

/** localStorage: bezoek aan /jasper (blijft na tab-wissel / magic link in nieuwe tab). */
export const JASPER_ATTRIBUTION_LS_KEY = "structuro_jasper_attribution";

/** Gratis proefdagen in de app voor luisteraars die hier signupen. */
export const JASPER_TRIAL_DAYS = 7;

/** Aantal maanden dat de korting in Stripe geldt (na de in-app trial). */
export const JASPER_OFFER_DISCOUNTED_MONTHS = 3;

/** Bedrag in eurocenten gedurende de kortingsperiode. */
export const JASPER_OFFER_DISCOUNTED_AMOUNT_CENTS = 799;

/** Reguliere maandprijs in eurocenten na afloop van de korting. */
export const JASPER_OFFER_REGULAR_AMOUNT_CENTS = 1299;

/** Verschil dat door de Stripe-coupon moet worden verlaagd (EUR 5,00). */
export const JASPER_OFFER_AMOUNT_OFF_CENTS =
  JASPER_OFFER_REGULAR_AMOUNT_CENTS - JASPER_OFFER_DISCOUNTED_AMOUNT_CENTS;

export type JasperOffer = {
  trialDays: number;
  discountedMonths: number;
  discountedPrice: string;
  regularPrice: string;
};

const EURO_FORMATTER = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

function formatEuro(cents: number): string {
  return EURO_FORMATTER.format(cents / 100);
}

export function getJasperOffer(): JasperOffer {
  return {
    trialDays: JASPER_TRIAL_DAYS,
    discountedMonths: JASPER_OFFER_DISCOUNTED_MONTHS,
    discountedPrice: formatEuro(JASPER_OFFER_DISCOUNTED_AMOUNT_CENTS),
    regularPrice: formatEuro(JASPER_OFFER_REGULAR_AMOUNT_CENTS),
  };
}

/** True als deze signup_source onder de Jasper-aanbieding valt. */
export function isJasperSignupSource(
  signupSource: string | null | undefined
): boolean {
  return normalizeSignupSourceKey(signupSource) === JASPER_SIGNUP_SOURCE;
}

/** Generieke bronnen die bij OAuth/magic link naar jasper_podcast mogen upgraden. */
export function isWeakProfileSourceForJasperUpgrade(
  signupSource: string | null | undefined
): boolean {
  const key = normalizeSignupSourceKey(signupSource);
  if (!key || key === "direct") return true;
  return key === "structuro_eu" || key === "google";
}

/**
 * Stripe coupon ID voor de Jasper-korting.
 *
 * Niels moet in het Stripe Dashboard handmatig een Coupon aanmaken met:
 *   - Type: Amount off, EUR 5,00 (500 cents)
 *   - Duration: repeating
 *   - Duration in months: 3
 *   - Currency: EUR
 * Zet daarna de ID in STRIPE_JASPER_COUPON_ID (server-only).
 *
 * Geen fallback: zonder env var krijgen Jasper-aanmeldingen GEEN coupon (de
 * Stripe-checkout faalt liever niet stilzwijgend met een fout coupon-id).
 */
export function getJasperStripeCouponId(): string | null {
  const raw = process.env.STRIPE_JASPER_COUPON_ID?.trim();
  if (!raw) return null;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(raw)) return null;
  return raw;
}

/**
 * Discount-array voor Stripe Checkout Session Create / Subscription Create
 * bij Jasper-signups. Retourneert null als de coupon nog niet geconfigureerd
 * is of de signup_source geen Jasper is.
 */
export function getJasperSubscriptionDiscount(
  signupSource: string | null | undefined
): Array<{ coupon: string }> | null {
  if (!isJasperSignupSource(signupSource)) return null;
  const coupon = getJasperStripeCouponId();
  if (!coupon) return null;
  return [{ coupon }];
}

/** True als pathname /jasper of subpath is. */
export function isJasperLandingPath(
  pathname: string | null | undefined
): boolean {
  if (!pathname) return false;
  if (pathname === JASPER_LANDING_PATH) return true;
  return pathname.startsWith(`${JASPER_LANDING_PATH}/`);
}
