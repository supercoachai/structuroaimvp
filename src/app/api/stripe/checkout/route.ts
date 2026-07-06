import { createClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/appUrl";
import { gateCheckoutServiceRole } from "@/lib/supabase/subscriptionRouteServiceRole";
import {
  STRIPE_PRICE_ID_MONTHLY,
  STRIPE_PRICE_ID_YEARLY,
} from "@/lib/stripe/registerPlans";
import { createSubscriptionCheckoutSession } from "@/lib/stripe/createSubscriptionCheckoutSession";
import { readCheckoutBonusTrialDays } from "@/lib/stripe/checkoutBonusTrialDays";
import {
  getJasperSubscriptionDiscount,
  isJasperSignupSource,
} from "@/lib/jasper/jasperOffer";
import { resolveProfileSignupSource } from "@/lib/posthog/signupAttribution";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("signup_source, checkout_bonus_trial_days")
    .eq("id", user.id)
    .maybeSingle();

  const signupSource = resolveProfileSignupSource(
    profile?.signup_source as string | null,
    user.user_metadata as Record<string, unknown> | undefined
  );
  const jasperDiscount = getJasperSubscriptionDiscount(signupSource);
  const jasperFlagged = isJasperSignupSource(signupSource);

  // Herinschrijving na verlopen proefperiode: geen nieuwe trial. Bewuste
  // uitzondering per account: checkout_bonus_trial_days (service_role only,
  // bv. compensatie na een storing) schuift de eerste betaalde maand op.
  // De webhook zet de kolom terug naar 0 na een afgeronde checkout.
  const session = await createSubscriptionCheckoutSession({
    stripe,
    priceId,
    userId: user.id,
    email: user.email,
    trialDays: readCheckoutBonusTrialDays(profile),
    successUrl: `${base}/abonnement?from=stripe`,
    cancelUrl: `${base}/abonnement`,
    metadata: jasperFlagged ? { jasper_offer: "1" } : undefined,
    subscriptionMetadata: jasperFlagged ? { jasper_offer: "1" } : undefined,
    discounts: jasperDiscount ?? undefined,
  });

  if (!session.url) {
    return NextResponse.json({ error: "No checkout URL" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}

export const POST = withApiErrorTracking("POST /api/stripe/checkout", postCheckout);
