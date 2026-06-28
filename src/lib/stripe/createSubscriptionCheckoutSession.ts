import type Stripe from "stripe";

import { CHECKOUT_SUBSCRIPTION_PAYMENT_METHOD_TYPES } from "@/lib/stripe/checkoutPaymentMethods";

export type CreateSubscriptionCheckoutInput = {
  stripe: Stripe;
  priceId: string;
  userId: string;
  email: string;
  trialDays: number;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  subscriptionMetadata?: Record<string, string>;
  /**
   * Optionele Stripe-coupons (bv. Jasper-podcast 3-maands korting). Bij
   * doorgegeven discounts zet Stripe `allow_promotion_codes` op false, anders
   * werpt de API een fout: beide tegelijk is niet toegestaan.
   */
  discounts?: Array<{ coupon: string }>;
};

/**
 * Stripe Checkout voor maand/jaar-abonnement met proefperiode.
 * Apple Pay / Google Pay (o.a. Samsung) verschijnen op de Stripe-pagina via `card`.
 * Betaalmethode wordt vastgelegd; na de trial start automatische incasso.
 */
export async function createSubscriptionCheckoutSession(
  input: CreateSubscriptionCheckoutInput
): Promise<Stripe.Checkout.Session> {
  const trialDays = Math.max(0, Math.min(90, Math.floor(input.trialDays)));

  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
    metadata: {
      supabase_user_id: input.userId,
      ...input.subscriptionMetadata,
    },
  };

  if (trialDays > 0) {
    subscriptionData.trial_period_days = trialDays;
  }

  const trialLabel =
    trialDays === 1
      ? "1 dag gratis"
      : trialDays > 0
        ? `${trialDays} dagen gratis`
        : null;

  const hasDiscount = (input.discounts?.length ?? 0) > 0;

  return input.stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: [...CHECKOUT_SUBSCRIPTION_PAYMENT_METHOD_TYPES],
    payment_method_collection: "always",
    client_reference_id: input.userId,
    customer_email: input.email,
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    locale: "nl",
    // Stripe staat geen combinatie toe van automatische coupon en promo-code-veld.
    ...(hasDiscount
      ? { discounts: input.discounts }
      : { allow_promotion_codes: true }),
    metadata: {
      supabase_user_id: input.userId,
      trial_days: String(trialDays),
      ...input.metadata,
    },
    subscription_data: subscriptionData,
    ...(trialLabel
      ? {
          custom_text: {
            submit: {
              message: `${trialLabel}, daarna wordt je abonnement automatisch verlengd. Je kunt altijd opzeggen in Instellingen.`,
            },
          },
        }
      : {}),
  });
}
