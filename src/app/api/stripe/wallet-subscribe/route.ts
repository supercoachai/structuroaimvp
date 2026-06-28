import { createClient } from "@/lib/supabase/server";
import { gateCheckoutServiceRole } from "@/lib/supabase/subscriptionRouteServiceRole";
import { getOrCreateStripeCustomer } from "@/lib/stripe/stripeCustomer";
import {
  createStripeServerClientFromEnv,
  profileFieldsFromStripeSubscription,
} from "@/lib/stripe/syncProfileSubscription";
import { STRIPE_PRICE_ID_MONTHLY } from "@/lib/stripe/registerPlans";
import { isRegistrationCheckoutEnabled } from "@/lib/stripe/registrationLaunch";
import {
  getJasperStripeCouponId,
  isJasperSignupSource,
} from "@/lib/jasper/jasperOffer";
import { resolveProfileSignupSource } from "@/lib/posthog/signupAttribution";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function postWalletSubscribe(request: Request) {
  if (!isRegistrationCheckoutEnabled()) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  const stripe = await createStripeServerClientFromEnv();
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  let body: { paymentMethodId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const paymentMethodId =
    typeof body.paymentMethodId === "string" ? body.paymentMethodId.trim() : "";
  if (!paymentMethodId) {
    return NextResponse.json({ error: "missing_payment_method" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !user.email?.trim()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const gate = gateCheckoutServiceRole();
  if (!gate.ok) return gate.response;

  if (gate.admin) {
    const emailNorm = user.email.trim().toLowerCase();
    const { data: refundRows } = await gate.admin
      .from("profiles")
      .select("id")
      .ilike("email", emailNorm)
      .not("refunded_at", "is", null)
      .limit(1);
    if (refundRows && refundRows.length > 0) {
      return NextResponse.json({ error: "previous_refund_exists" }, { status: 403 });
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, stripe_subscription_id, signup_source")
    .eq("id", user.id)
    .maybeSingle();

  const customerId = await getOrCreateStripeCustomer(stripe, {
    userId: user.id,
    email: user.email,
    existingCustomerId: (profile?.stripe_customer_id as string | null) ?? null,
  });

  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  const signupSource = resolveProfileSignupSource(
    profile?.signup_source as string | null,
    user.user_metadata as Record<string, unknown> | undefined
  );
  const jasperFlagged = isJasperSignupSource(signupSource);
  const jasperCoupon = jasperFlagged ? getJasperStripeCouponId() : null;

  const subscriptionMetadata: Record<string, string> = {
    supabase_user_id: user.id,
  };
  if (jasperFlagged) subscriptionMetadata.jasper_offer = "1";

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: STRIPE_PRICE_ID_MONTHLY }],
    default_payment_method: paymentMethodId,
    metadata: subscriptionMetadata,
    ...(jasperCoupon ? { discounts: [{ coupon: jasperCoupon }] } : {}),
    expand: ["latest_invoice.payment_intent"],
  });

  const latestInvoice = subscription.latest_invoice;
  if (
    latestInvoice &&
    typeof latestInvoice !== "string" &&
    latestInvoice.payment_intent &&
    typeof latestInvoice.payment_intent !== "string"
  ) {
    const pi = latestInvoice.payment_intent;
    if (pi.status === "requires_action" || pi.status === "requires_confirmation") {
      await stripe.paymentIntents.confirm(pi.id, { payment_method: paymentMethodId });
    }
  }

  const refreshed = await stripe.subscriptions.retrieve(subscription.id);
  const update = profileFieldsFromStripeSubscription(refreshed, customerId);

  if (gate.admin) {
    const { error: upErr } = await gate.admin
      .from("profiles")
      .update(update)
      .eq("id", user.id);
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    status: update.subscription_status,
    current_period_end: update.subscription_current_period_end,
  });
}

export const POST = withApiErrorTracking(
  "POST /api/stripe/wallet-subscribe",
  postWalletSubscribe
);
