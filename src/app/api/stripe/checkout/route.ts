import { createClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/appUrl";
import { gateCheckoutServiceRole } from "@/lib/supabase/subscriptionRouteServiceRole";
import {
  STRIPE_PRICE_ID_MONTHLY,
  STRIPE_PRICE_ID_YEARLY,
} from "@/lib/stripe/registerPlans";
import { CHECKOUT_SUBSCRIPTION_PAYMENT_METHOD_TYPES } from "@/lib/stripe/checkoutPaymentMethods";
import { createStripeServerClient } from "@/lib/stripeServer";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import { isRegistrationCheckoutEnabled } from "@/lib/stripe/registrationLaunch";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function postCheckout(request: Request) {
  if (!isRegistrationCheckoutEnabled()) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  const monthly = STRIPE_PRICE_ID_MONTHLY;
  const yearly = STRIPE_PRICE_ID_YEARLY;
  if (!key) {
    return NextResponse.json(
      { error: "Stripe is not configured on the server." },
      { status: 503 }
    );
  }

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const plan = body.plan === "yearly" ? "yearly" : body.plan === "monthly" ? "monthly" : null;
  if (!plan) {
    return NextResponse.json({ error: "Expected plan: monthly | yearly" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !user.email?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /** Zelfde regel als refund: max één levenslange self-service refund per e-mail; geen nieuw abonnement daarna. */
  const gate = gateCheckoutServiceRole();
  if (!gate.ok) return gate.response;
  if (gate.admin) {
    const emailNorm = user.email.trim().toLowerCase();
    const { data: refundRows, error: refundQErr } = await gate.admin
      .from("profiles")
      .select("id")
      .ilike("email", emailNorm)
      .not("refunded_at", "is", null)
      .limit(1);
    if (refundQErr) {
      console.error("[checkout] prior refund check", refundQErr);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
    if (refundRows && refundRows.length > 0) {
      return NextResponse.json(
        { error: "previous_refund_exists" },
        { status: 403 }
      );
    }
  }

  const priceId = plan === "yearly" ? yearly : monthly;
  const stripe = createStripeServerClient(key);
  const base = getAppOrigin();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: [...CHECKOUT_SUBSCRIPTION_PAYMENT_METHOD_TYPES],
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/abonnement?from=stripe`,
    cancel_url: `${base}/abonnement`,
    locale: "nl",
    allow_promotion_codes: true,
    metadata: {
      supabase_user_id: user.id,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
      },
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "No checkout URL" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}

export const POST = withApiErrorTracking("POST /api/stripe/checkout", postCheckout);
