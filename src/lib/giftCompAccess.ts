/**
 * Handmatig geschonken gratis accounts (geen Stripe-checkout).
 * signup_source = gift_comp + meestal subscription_status = active.
 */

import { normalizeSignupSourceKey } from "@/lib/stripe/trialConfig";

export const GIFT_COMP_SIGNUP_SOURCE = "gift_comp";

/** True als dit een gift/comp-account is (geen betaalpoort). */
export function isGiftCompSignupSource(
  signupSource: string | null | undefined
): boolean {
  return normalizeSignupSourceKey(signupSource) === GIFT_COMP_SIGNUP_SOURCE;
}
