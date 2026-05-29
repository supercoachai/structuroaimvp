import { createClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/appUrl";
import { gateCheckoutServiceRole } from "@/lib/supabase/subscriptionRouteServiceRole";
import { CHECKOUT_METADATA_WELCOME_TASK } from "@/lib/onboardingWelcomeTask";
import { isAllowedStripePriceId } from "@/lib/stripe/registerPlans";
import { createStripeServerClient } from "@/lib/stripeServer";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import { isRegistrationCheckoutEnabled } from "@/lib/stripe/registrationLaunch";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function postCreateSession(request: Request) {
  if (!isRegistrationCheckoutEnabled()) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "stripe_not_configured" },
      { status: 503 }
    );
  }

  let body: {
    priceId?: string;
    userId?: string;
    email?: string;
    addWelcomeTask?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const priceId = typeof body.priceId === "string" ? body.priceId.trim() : "";
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const addWelcomeTask = body.addWelcomeTask === true;

  if (!priceId || !userId || !email) {
    return NextResponse.json({ error: "missing_parameters" }, { status: 400 });
  }

  if (!isAllowedStripePriceId(priceId)) {
    return NextResponse.json({ error: "invalid_price_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || user.id !== userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if ((user.email ?? "").trim().toLowerCase() !== email) {
    return NextResponse.json({ error: "email_mismatch" }, { status: 403 });
  }

  const gate = gateCheckoutServiceRole();
  if (!gate.ok) return gate.response;
  if (gate.admin) {
    const { data: refundRows, error: refundQErr } = await gate.admin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .not("refunded_at", "is", null)
      .limit(1);
    if (refundQErr) {
      console.error("[checkout/create-session] prior refund check", refundQErr);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    if (refundRows && refundRows.length > 0) {
      return NextResponse.json(
        { error: "previous_refund_exists" },
        { status: 403 }
      );
    }
  }

  const stripe = createStripeServerClient(key);
  const base = getAppOrigin();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card", "ideal"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email,
    client_reference_id: userId,
    success_url: `${base}/welkom?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/registreren/plan?cancelled=1`,
    locale: "nl",
    allow_promotion_codes: true,
    metadata: {
      supabase_user_id: userId,
      [CHECKOUT_METADATA_WELCOME_TASK]: addWelcomeTask ? "1" : "0",
    },
    subscription_data: {
      metadata: {
        supabase_user_id: userId,
      },
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "no_checkout_url" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}

export const POST = withApiErrorTracking(
  "POST /api/checkout/create-session",
  postCreateSession
);
