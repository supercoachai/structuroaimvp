import { getAppOrigin } from "@/lib/appUrl";
import {
  CHECKOUT_RESUME_COOKIE,
  CHECKOUT_RESUME_MAX_AGE_SEC,
  signCheckoutResumeToken,
} from "@/lib/checkoutResumeBinding";
import { createStripeServerClient } from "@/lib/stripeServer";
import { isRegistrationCheckoutEnabled } from "@/lib/stripe/registrationLaunch";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_SESSION_AGE_MS = 48 * 60 * 60 * 1000;

/**
 * Koppelt een betaalde Stripe-checkout aan deze browser via httpOnly-cookie.
 * Vereist vóór resume-session (voorkomt token_hash-lek aan willekeurige callers).
 */
async function postBindSession(request: Request) {
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

  const token = signCheckoutResumeToken(sessionId);
  const res = NextResponse.json({ ok: true });
  const secure = getAppOrigin().startsWith("https://");
  res.cookies.set(CHECKOUT_RESUME_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: CHECKOUT_RESUME_MAX_AGE_SEC,
  });
  return res;
}

export const POST = withApiErrorTracking(
  "POST /api/checkout/bind-session",
  postBindSession
);
