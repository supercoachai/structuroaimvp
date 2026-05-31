/**
 * Stripe Checkout betaalmethoden voor abonnementen (EUR).
 *
 * iDEAL | Wero (recurring in Dashboard): eerste betaling via iDEAL, Stripe slaat
 * daarna een SEPA-incassomachtiging op voor verlengingen (maand/jaar). Zie
 * https://docs.stripe.com/billing/subscriptions/ideal
 *
 * `sepa_debit` als losse optie alleen toevoegen als SEPA Direct Debit ook als
 * standalone methode in het Stripe Dashboard staat (niet alleen via iDEAL recurring).
 */
export const CHECKOUT_SUBSCRIPTION_PAYMENT_METHOD_TYPES = [
  "card",
  "ideal",
] as const;
