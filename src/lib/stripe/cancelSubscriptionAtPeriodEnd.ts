import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { createStripeServerClient } from "@/lib/stripeServer";

export type CancelSubscriptionAtPeriodEndResult =
  | { ok: true; subscriptionId: string }
  | { ok: false; error: string; status: number };

/** Zet Stripe-abonnement op cancel_at_period_end (gedeeld door auth + one-click). */
export async function cancelSubscriptionAtPeriodEndForUser(
  userId: string
): Promise<CancelSubscriptionAtPeriodEndResult> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    return { ok: false, error: "Stripe is not configured.", status: 503 };
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return { ok: false, error: "Server misconfigured.", status: 503 };
  }

  const { data: profile, error } = await admin
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message, status: 500 };
  }

  const subId =
    profile && typeof profile.stripe_subscription_id === "string"
      ? profile.stripe_subscription_id
      : null;
  if (!subId) {
    return {
      ok: false,
      error: "Geen actief abonnement gevonden.",
      status: 400,
    };
  }

  const stripe = createStripeServerClient(key);
  await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
  return { ok: true, subscriptionId: subId };
}
