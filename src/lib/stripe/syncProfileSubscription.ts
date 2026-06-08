import type Stripe from "stripe";

import {
  createStripeServerClient,
  subscriptionCurrentPeriodEndUnix,
} from "@/lib/stripeServer";

import { planFromStripePriceId } from "@/lib/stripe/registerPlans";
import { mapStripeSubscriptionStatus } from "@/lib/stripe/mapStripeSubscriptionStatus";

export { mapStripeSubscriptionStatus };

export function profileFieldsFromStripeSubscription(
  subscription: Stripe.Subscription,
  customerId: string
): Record<string, unknown> {
  const priceId = subscription.items.data[0]?.price?.id;
  const plan = planFromStripePriceId(priceId ?? "");
  const periodEnd = new Date(
    subscriptionCurrentPeriodEndUnix(subscription) * 1000
  ).toISOString();
  const startedAt = new Date(subscription.created * 1000).toISOString();

  return {
    subscription_status: mapStripeSubscriptionStatus(subscription),
    subscription_plan: plan,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    subscription_started_at: startedAt,
    subscription_current_period_end: periodEnd,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
  };
}

function subscriptionRank(subscription: Stripe.Subscription): number {
  if (subscription.status === "active" && !subscription.cancel_at_period_end) {
    return 0;
  }
  if (subscription.status === "trialing") return 1;
  if (subscription.status === "active" && subscription.cancel_at_period_end) {
    return 2;
  }
  if (subscription.status === "past_due") return 3;
  if (subscription.status === "canceled") return 4;
  return 5;
}

function pickBestSubscription(
  subscriptions: Stripe.Subscription[]
): Stripe.Subscription | null {
  if (!subscriptions.length) return null;
  return [...subscriptions].sort(
    (a, b) => subscriptionRank(a) - subscriptionRank(b)
  )[0];
}

export type FindSubscriptionInput = {
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  email?: string | null;
};

export async function findStripeSubscriptionForUser(
  stripe: Stripe,
  input: FindSubscriptionInput
): Promise<{ subscription: Stripe.Subscription; customerId: string } | null> {
  const subId = input.stripeSubscriptionId?.trim();
  if (subId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subId);
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id;
      if (customerId) return { subscription, customerId };
    } catch {
      /* fall through */
    }
  }

  const customerId = input.stripeCustomerId?.trim();
  if (customerId) {
    const listed = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20,
    });
    const best = pickBestSubscription(listed.data);
    if (best) return { subscription: best, customerId };
  }

  const email = input.email?.trim().toLowerCase();
  if (email) {
    const customers = await stripe.customers.list({ email, limit: 10 });
    for (const customer of customers.data) {
      const listed = await stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 20,
      });
      const best = pickBestSubscription(listed.data);
      if (best) return { subscription: best, customerId: customer.id };
    }
  }

  return null;
}

export async function createStripeServerClientFromEnv(): Promise<Stripe | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return createStripeServerClient(key);
}
