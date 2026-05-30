import { getAppOrigin } from "@/lib/appUrl";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { createStripeServerClient } from "@/lib/stripeServer";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import { isRegistrationCheckoutEnabled } from "@/lib/stripe/registrationLaunch";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_SESSION_AGE_MS = 48 * 60 * 60 * 1000;

/**
 * Na Stripe-checkout: stille sessie-herstel via magic link token.
 * Alleen als checkout session_id betaald is (cs_… als eenmalig bewijs).
 */
async function postResumeSession(request: Request) {
  if (!isRegistrationCheckoutEnabled()) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  let body: { session_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const sessionId = body.session_id?.trim();
  if (!sessionId?.startsWith("cs_")) {
    return NextResponse.json({ error: "invalid_session_id" }, { status: 400 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_role_key_missing" }, { status: 503 });
  }

  const stripe = createStripeServerClient(stripeKey);
  let checkoutSession;
  try {
    checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  const paid =
    checkoutSession.payment_status === "paid" ||
    checkoutSession.status === "complete";
  if (!paid) {
    return NextResponse.json({ error: "payment_not_complete" }, { status: 409 });
  }

  const createdMs = (checkoutSession.created ?? 0) * 1000;
  if (Date.now() - createdMs > MAX_SESSION_AGE_MS) {
    return NextResponse.json({ error: "session_expired" }, { status: 410 });
  }

  const userId =
    (typeof checkoutSession.client_reference_id === "string" &&
      checkoutSession.client_reference_id) ||
    checkoutSession.metadata?.supabase_user_id ||
    null;

  if (!userId) {
    return NextResponse.json({ error: "user_not_linked" }, { status: 422 });
  }

  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(
    userId
  );
  if (userErr || !userData.user?.email) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const email = userData.user.email.trim().toLowerCase();
  const origin = getAppOrigin();

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/onboarding")}`,
    },
  });

  if (linkErr || !linkData.properties?.hashed_token) {
    console.error("[checkout/resume-session] generateLink", linkErr);
    return NextResponse.json({ error: "session_token_failed" }, { status: 500 });
  }

  return NextResponse.json({
    token_hash: linkData.properties.hashed_token,
    email,
  });
}

export const POST = withApiErrorTracking(
  "POST /api/checkout/resume-session",
  postResumeSession
);
