import type Stripe from "stripe";

/** Map Stripe subscription.status → profiles.subscription_status. */
export function mapStripeSubscriptionStatus(
  subscription: Stripe.Subscription
): string {
  if (subscription.status === "past_due") return "past_due";
  if (subscription.status === "canceled" || subscription.status === "unpaid") {
    return "cancelled";
  }
  if (subscription.status === "trialing") {
    return subscription.cancel_at_period_end ? "cancelled" : "trialing";
  }
  if (subscription.status === "active") {
    return subscription.cancel_at_period_end ? "cancelled" : "active";
  }
  return "none";
}
